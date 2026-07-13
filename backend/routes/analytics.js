const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/:eventId', protect, authorize('organizer'), async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 1. Aggregation pipeline to compute tickets sold, revenue, and ticket tier breakdown
    const stats = await Ticket.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      {
        $lookup: {
          from: 'seats',
          localField: 'seat',
          foreignField: '_id',
          as: 'seatDetails',
        },
      },
      { $unwind: '$seatDetails' },
      {
        $group: {
          _id: '$seatDetails.tier',
          soldCount: { $sum: 1 },
          checkedInCount: {
            $sum: { $cond: [{ $eq: ['$isCheckedIn', true] }, 1, 0] },
          },
        },
      },
    ]);

    // Map stats to tier configurations
    let totalRevenue = 0;
    let totalSold = 0;
    let totalCheckedIn = 0;

    const tierStats = event.priceTiers.map((tier) => {
      const match = stats.find((s) => s._id === tier.name);
      const sold = match ? match.soldCount : 0;
      const checkedIn = match ? match.checkedInCount : 0;
      const revenue = sold * tier.price;

      totalRevenue += revenue;
      totalSold += sold;
      totalCheckedIn += checkedIn;

      return {
        tierName: tier.name,
        price: tier.price,
        capacity: tier.capacity,
        sold,
        checkedIn,
        revenue,
      };
    });

    const soldPercentage = event.capacity > 0 ? (totalSold / event.capacity) * 100 : 0;

    res.json({
      event: {
        id: event._id,
        title: event.title,
        capacity: event.capacity,
        venue: event.venue,
        date: event.date,
      },
      summary: {
        totalRevenue,
        totalSold,
        totalCheckedIn,
        soldPercentage: parseFloat(soldPercentage.toFixed(2)),
      },
      tiers: tierStats,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:eventId/roster', protect, authorize('organizer'), async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const tickets = await Ticket.find({ event: eventId })
      .populate('user', 'name email')
      .populate('seat', 'row number tier status')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    next(error);
  }
});

router.get('/:eventId/roster/csv', protect, authorize('organizer'), async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const tickets = await Ticket.find({ event: eventId })
      .populate('user', 'name email')
      .populate('seat', 'row number tier');

    // Generate CSV string manually without package overhead
    let csvContent = 'Attendee Name,Attendee Email,Seat Row,Seat Number,Seat Tier,Checked In,Checked In Time\n';

    tickets.forEach((ticket) => {
      const checkInTime = ticket.checkedInAt ? ticket.checkedInAt.toISOString() : 'N/A';
      csvContent += `"${ticket.user.name}","${ticket.user.email}","${ticket.seat.row}",${ticket.seat.number},"${ticket.seat.tier}",${ticket.isCheckedIn},"${checkInTime}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=roster-${event.title.replace(/\s+/g, '-').toLowerCase()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

router.post('/:eventId/announcements', protect, authorize('organizer'), async (req, res, next) => {
  const { eventId } = req.params;
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const announcement = await Announcement.create({
      event: eventId,
      organizer: req.user._id,
      message: message.trim(),
    });

    // Broadcast live announcement update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('announcement:new', {
        id: announcement._id,
        message: announcement.message,
        sentAt: announcement.sentAt,
      });
    }

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    next(error);
  }
});

router.get('/:eventId/announcements', protect, async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ event: req.params.eventId })
      .populate('organizer', 'name')
      .sort({ sentAt: -1 });
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
