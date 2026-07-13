const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    row: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: Number,
      required: true,
    },
    tier: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'held', 'booked'],
      default: 'available',
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    heldUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

seatSchema.index({ event: 1, row: 1, number: 1 }, { unique: true });
seatSchema.index({ heldUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Seat', seatSchema);
