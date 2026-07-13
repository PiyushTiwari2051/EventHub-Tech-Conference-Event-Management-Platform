const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'attendee') {
      query.user = req.user._id;
    }
    const bookings = await Booking.find(query)
      .populate('event')
      .populate('seats')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, authorize('attendee'), async (req, res, next) => {
  const { eventId, seatIds, paymentMethod } = req.body;

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ message: 'No seats selected' });
  }

  const client = mongoose.connection.client;
  const isReplicaSet = client && client.topology && client.topology.description && client.topology.description.type !== 'Single';

  let session = null;
  let useTransaction = false;

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      useTransaction = false;
      if (session) {
        session.endSession();
        session = null;
      }
    }
  }

  try {
    const opts = useTransaction && session ? { session } : {};

    // 1. Fetch Event
    let eventQuery = Event.findById(eventId);
    if (useTransaction && session) {
      eventQuery = eventQuery.session(session);
    }
    const event = await eventQuery;
    if (!event) {
      throw new Error('Event not found');
    }

    // 2. Fetch and Validate Seats
    let seatsQuery = Seat.find({ _id: { $in: seatIds }, event: eventId });
    if (useTransaction && session) {
      seatsQuery = seatsQuery.session(session);
    }
    const seats = await seatsQuery;
    if (seats.length !== seatIds.length) {
      throw new Error('Some selected seats do not exist');
    }

    const now = new Date();
    let totalAmount = 0;

    for (const seat of seats) {
      // Seat can be booked if it is:
      // A) Available
      // B) Held by current user and hold hasn't expired
      const isAvailable = seat.status === 'available';
      const isHeldBySelf =
        seat.status === 'held' &&
        seat.heldBy &&
        seat.heldBy.toString() === req.user._id.toString() &&
        seat.heldUntil &&
        seat.heldUntil > now;

      if (!isAvailable && !isHeldBySelf) {
        res.status(400);
        throw new Error(`Seat ${seat.row}-${seat.number} is no longer available`);
      }

      // Calculate total amount from event price tiers
      const tierConfig = event.priceTiers.find((t) => t.name === seat.tier);
      totalAmount += tierConfig ? tierConfig.price : 0;
    }

    // 3. Mock Payment Processing Step
    // Card payments can be simulated. If paymentMethod is invalid, throw error.
    if (paymentMethod === 'fail') {
      res.status(402);
      throw new Error('Payment processing failed. Insufficient funds.');
    }

    const transactionId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 4. Update Seat Statuses
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { status: 'booked', heldBy: null, heldUntil: null } },
      opts
    );

    // 5. Create Booking Document
    const booking = new Booking({
      user: req.user._id,
      event: eventId,
      seats: seatIds,
      totalAmount,
      paymentStatus: 'paid',
      transactionId,
    });
    await booking.save(opts);

    // 6. Create Tickets and Generate Signed QR Tokens
    const tickets = [];
    for (const seat of seats) {
      const ticket = new Ticket({
        booking: booking._id,
        user: req.user._id,
        event: eventId,
        seat: seat._id,
        qrToken: 'PENDING_JWT',
      });

      // Sign the token with JWT
      const qrPayload = {
        ticketId: ticket._id,
        eventId: eventId,
        seatId: seat._id,
        userId: req.user._id,
      };
      
      const token = jwt.sign(qrPayload, process.env.JWT_SECRET || 'fallback_secret_key_2026');
      ticket.qrToken = token;
      
      await ticket.save(opts);
      tickets.push(ticket);
    }

    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    // Broadcast Seat status updates via socket to event room (handled at server level, we emit in socket manager)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      seatIds.forEach((id) => {
        io.to(`event_${eventId}`).emit('seat:status_changed', {
          seatId: id,
          status: 'booked',
          heldBy: null,
        });
      });
    }

    res.status(201).json({
      success: true,
      booking,
      tickets,
    });
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(error);
  }
});

router.post('/:id/cancel', protect, authorize('attendee'), async (req, res, next) => {
  const client = mongoose.connection.client;
  const isReplicaSet = client && client.topology && client.topology.description && client.topology.description.type !== 'Single';

  let session = null;
  let useTransaction = false;

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (e) {
      useTransaction = false;
      if (session) {
        session.endSession();
        session = null;
      }
    }
  }

  try {
    const opts = useTransaction && session ? { session } : {};

    let bookingQuery = Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (useTransaction && session) {
      bookingQuery = bookingQuery.session(session);
    }
    const booking = await bookingQuery;
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found or not owned by user');
    }

    if (booking.paymentStatus === 'cancelled') {
      res.status(400);
      throw new Error('Booking is already cancelled');
    }

    // Reset seats back to available
    await Seat.updateMany(
      { _id: { $in: booking.seats } },
      { $set: { status: 'available', heldBy: null, heldUntil: null } },
      opts
    );

    // Cancel the booking status
    booking.paymentStatus = 'cancelled';
    await booking.save(opts);

    // Invalidate/Delete tickets associated with this booking
    await Ticket.deleteMany({ booking: booking._id }, opts);

    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    // Broadcast changes via socket
    if (req.app.get('io')) {
      const io = req.app.get('io');
      booking.seats.forEach((id) => {
        io.to(`event_${booking.event}`).emit('seat:status_changed', {
          seatId: id,
          status: 'available',
          heldBy: null,
        });
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully and seats released.',
      refundedAmount: booking.totalAmount,
    });
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(error);
  }
});

module.exports = router;
