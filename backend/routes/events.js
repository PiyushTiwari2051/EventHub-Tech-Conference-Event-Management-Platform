const express = require('express');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { search, venue, date } = req.query;
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (venue) {
      query.venue = { $regex: venue, $options: 'i' };
    }
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ date: 1 });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, authorize('organizer'), async (req, res, next) => {
  const { title, description, date, venue, capacity, priceTiers } = req.body;

  try {
    // 1. Create the event
    const event = await Event.create({
      title,
      description,
      date,
      venue,
      capacity,
      priceTiers,
      organizer: req.user._id,
    });

    // 2. Generate seat layouts for this event in bulk
    const seatsToInsert = [];
    let rowChar = 65; // ASCII for 'A'
    
    for (const tier of priceTiers) {
      const seatsPerRow = 10;
      const totalTierSeats = tier.capacity;
      const numRowsNeeded = Math.ceil(totalTierSeats / seatsPerRow);

      for (let r = 0; r < numRowsNeeded; r++) {
        const rowName = String.fromCharCode(rowChar);
        const startNumber = 1;
        const endNumber = Math.min(seatsPerRow, totalTierSeats - r * seatsPerRow);

        for (let num = startNumber; num <= endNumber; num++) {
          seatsToInsert.push({
            event: event._id,
            row: rowName,
            number: num,
            tier: tier.name,
            status: 'available',
          });
        }
        rowChar++;
      }
    }

    // Insert many seats
    await Seat.insertMany(seatsToInsert);

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/seats', async (req, res, next) => {
  try {
    const seats = await Seat.find({ event: req.params.id }).sort({ row: 1, number: 1 });
    res.json(seats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
