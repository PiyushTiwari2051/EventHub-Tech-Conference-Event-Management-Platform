const Seat = require('../models/Seat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // 1. Join room per event
    socket.on('join_event', ({ eventId }) => {
      socket.join(`event_${eventId}`);
    });

    socket.on('leave_event', ({ eventId }) => {
      socket.leave(`event_${eventId}`);
    });

    // 2. Request seat hold (2 minutes)
    socket.on('seat:hold', async ({ eventId, seatId, userId }) => {
      if (!userId) return;

      try {
        const seat = await Seat.findOne({ _id: seatId, event: eventId });
        if (!seat) {
          return socket.emit('seat:hold_error', { seatId, message: 'Seat not found' });
        }

        const now = new Date();
        const isExpired = seat.status === 'held' && seat.heldUntil && seat.heldUntil < now;

        if (seat.status === 'available' || isExpired) {
          seat.status = 'held';
          seat.heldBy = userId;
          seat.heldUntil = new Date(Date.now() + 120000); // 2 minutes
          await seat.save();

          // Broadcast to event room
          io.to(`event_${eventId}`).emit('seat:status_changed', {
            seatId: seat._id,
            status: 'held',
            heldBy: userId,
            heldUntil: seat.heldUntil,
          });

          // Register automatic timer release after 2 minutes
          setTimeout(async () => {
            try {
              const currentSeat = await Seat.findById(seatId);
              // Only release if it's still held by the same user and hasn't progressed to booked
              if (
                currentSeat &&
                currentSeat.status === 'held' &&
                currentSeat.heldBy &&
                currentSeat.heldBy.toString() === userId.toString()
              ) {
                currentSeat.status = 'available';
                currentSeat.heldBy = null;
                currentSeat.heldUntil = null;
                await currentSeat.save();

                io.to(`event_${eventId}`).emit('seat:status_changed', {
                  seatId: currentSeat._id,
                  status: 'available',
                  heldBy: null,
                });
              }
            } catch (err) {
              console.error('Seat hold timeout cleanup error:', err.message);
            }
          }, 120000);
        } else {
          socket.emit('seat:hold_error', { seatId, message: 'Seat already taken or held' });
        }
      } catch (err) {
        socket.emit('seat:hold_error', { seatId, message: 'Internal socket hold error' });
      }
    });

    // 3. Request seat release
    socket.on('seat:release', async ({ eventId, seatId, userId }) => {
      if (!userId) return;

      try {
        const seat = await Seat.findOne({ _id: seatId, event: eventId });
        if (
          seat &&
          seat.status === 'held' &&
          seat.heldBy &&
          seat.heldBy.toString() === userId.toString()
        ) {
          seat.status = 'available';
          seat.heldBy = null;
          seat.heldUntil = null;
          await seat.save();

          io.to(`event_${eventId}`).emit('seat:status_changed', {
            seatId: seat._id,
            status: 'available',
            heldBy: null,
          });
        }
      } catch (err) {
        console.error('Socket release error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Cleanups on network loss could be done here, but TTL handles it gracefully.
    });
  });
};
