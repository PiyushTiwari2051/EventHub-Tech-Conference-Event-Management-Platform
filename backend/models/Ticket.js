const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    isCheckedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
