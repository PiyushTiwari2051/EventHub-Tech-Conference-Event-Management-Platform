const mongoose = require('mongoose');

const priceTierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Price tier name is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  capacity: {
    type: Number,
    required: [true, 'Tier capacity is required'],
    min: [1, 'Capacity must be at least 1'],
  },
});

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Total capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    priceTiers: {
      type: [priceTierSchema],
      required: true,
      validate: [
        (val) => val.length > 0,
        'At least one price tier is required',
      ],
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Event', eventSchema);
