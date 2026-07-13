import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = 'http://localhost:5000';

export const useSocket = (eventId, onSeatStatusChange, onAnnouncement, onCheckinUpdate) => {
  const socketRef = useRef(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user || !eventId) return;

    // Establish WebSocket connection
    const socket = io(SOCKET_URL, {
      query: { userId: user._id },
    });
    socketRef.current = socket;

    // Join room for the current event
    socket.emit('join_event', { eventId });

    // Sockets Listeners
    if (onSeatStatusChange) {
      socket.on('seat:status_changed', onSeatStatusChange);
    }
    if (onAnnouncement) {
      socket.on('announcement:new', onAnnouncement);
    }
    if (onCheckinUpdate) {
      socket.on('checkin:update', onCheckinUpdate);
    }

    // Cleanup connection
    return () => {
      socket.emit('leave_event', { eventId });
      socket.off('seat:status_changed');
      socket.off('announcement:new');
      socket.off('checkin:update');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId, user, onSeatStatusChange, onAnnouncement, onCheckinUpdate]);

  const holdSeat = (seatId) => {
    if (socketRef.current && user) {
      socketRef.current.emit('seat:hold', { eventId, seatId, userId: user._id });
    }
  };

  const releaseSeat = (seatId) => {
    if (socketRef.current && user) {
      socketRef.current.emit('seat:release', { eventId, seatId, userId: user._id });
    }
  };

  return { holdSeat, releaseSeat };
};
