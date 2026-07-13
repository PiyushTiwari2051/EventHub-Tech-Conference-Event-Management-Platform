const express = require('express');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'attendee') {
      query.user = req.user._id;
    }
    const tickets = await Ticket.find(query)
      .populate('event')
      .populate('seat')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event')
      .populate('seat')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'attendee' && ticket.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/qr', protect, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'attendee' && ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this ticket' });
    }

    // Generate base64 QR code representation of the signed JWT token
    const qrCodeUrl = await QRCode.toDataURL(ticket.qrToken);
    res.json({ qrCodeUrl });
  } catch (error) {
    next(error);
  }
});

router.post('/verify', protect, authorize('organizer'), async (req, res, next) => {
  const { qrToken } = req.body;

  if (!qrToken) {
    return res.status(400).json({ message: 'QR Token is required for check-in' });
  }

  try {
    // 1. Verify and decode JWT
    const decoded = jwt.verify(qrToken, process.env.JWT_SECRET || 'fallback_secret_key_2026');

    // 2. Fetch Ticket
    const ticket = await Ticket.findById(decoded.ticketId)
      .populate('event')
      .populate('seat')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Valid token but ticket record was not found' });
    }

    // 3. Prevent duplicate check-in scans
    if (ticket.isCheckedIn) {
      return res.status(400).json({
        message: `Ticket already scanned for seat ${ticket.seat.row}-${ticket.seat.number} at ${ticket.checkedInAt.toLocaleTimeString()}`,
      });
    }

    // 4. Mark checked in
    ticket.isCheckedIn = true;
    ticket.checkedInAt = new Date();
    await ticket.save();

    // 5. Broadcast live attendee count update via Socket.io
    const io = req.app.get('io');
    if (io) {
      const checkInCount = await Ticket.countDocuments({ event: ticket.event._id, isCheckedIn: true });
      io.to(`event_${ticket.event._id}`).emit('checkin:update', {
        eventId: ticket.event._id,
        checkInCount,
        checkedInSeat: `${ticket.seat.row}-${ticket.seat.number}`,
      });
    }

    res.json({
      success: true,
      message: 'Check-in successful',
      attendee: ticket.user.name,
      seat: `${ticket.seat.row}-${ticket.seat.number}`,
      event: ticket.event.title,
    });
  } catch (error) {
    console.error('QR verification failed:', error.message);
    res.status(400).json({ message: 'Invalid or expired check-in token' });
  }
});

module.exports = router;
