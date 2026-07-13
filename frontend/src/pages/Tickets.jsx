import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, MapPin, Ticket, AlertTriangle, CreditCard } from 'lucide-react';

export const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchTickets = async () => {
    try {
      const data = await api.get('/tickets');
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenQRModal = async (ticket) => {
    setSelectedTicket(ticket);
    setQrUrl('');
    try {
      const res = await api.get(`/tickets/${ticket._id}/qr`);
      setQrUrl(res.qrCodeUrl);
    } catch (err) {
      console.error('Failed to get ticket QR:', err.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This will refund your payment and release your seats.')) return;
    setCancellingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      alert('Booking cancelled successfully. Funds refunded to mock payment method.');
      fetchTickets();
    } catch (err) {
      alert(err.message || 'Cancellation failed.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-10 h-10 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Filter out unique bookings to support block cancellations
  const bookingMap = {};
  tickets.forEach((t) => {
    if (t.booking) {
      if (!bookingMap[t.booking._id]) {
        bookingMap[t.booking._id] = {
          bookingId: t.booking._id,
          event: t.event,
          createdAt: t.createdAt,
          paymentStatus: t.booking.paymentStatus,
          totalAmount: t.booking.totalAmount,
          tickets: [],
        };
      }
      bookingMap[t.booking._id].tickets.push(t);
    }
  });
  const bookings = Object.values(bookingMap);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="border-b border-white/5 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white">My Reservations Ledger</h1>
        <p className="text-sm text-gray-400 mt-1">Verify gate passes, download security QR tokens, or cancel upcoming bookings.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl max-w-lg mx-auto border-white/5 space-y-4">
          <Ticket className="w-12 h-12 text-gray-500 mx-auto stroke-1" />
          <p className="text-gray-400 text-sm">No ticket bookings found. Head to the event catalog to reserve seats.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          {bookings.map((booking) => {
            const isCancelled = booking.paymentStatus === 'cancelled';
            const eventDate = new Date(booking.event.date);
            const isPast = eventDate < new Date();

            return (
              <div key={booking.bookingId} className={`glass rounded-2xl overflow-hidden border-white/5 flex flex-col md:flex-row justify-between ${isCancelled ? 'opacity-50' : ''}`}>
                {/* Left side details */}
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-brand-indigo uppercase bg-brand-indigo/10 px-2 py-0.5 rounded border border-brand-indigo/20">
                        Reference: {booking.bookingId.substr(-6).toUpperCase()}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-2">{booking.event.title}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-brand-rose/10 border border-brand-rose/25 text-brand-rose'
                          : isPast
                          ? 'bg-gray-500/10 border border-gray-500/25 text-gray-400'
                          : 'bg-green-500/10 border border-green-500/25 text-green-400'
                      }`}
                    >
                      {isCancelled ? 'Cancelled' : isPast ? 'Past Event' : 'Confirmed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-indigo" />
                      <span>{eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-indigo" />
                      <span>{booking.event.venue}</span>
                    </div>
                  </div>

                  {/* Seat listings */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {booking.tickets.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => !isCancelled && handleOpenQRModal(t)}
                        disabled={isCancelled}
                        className="bg-dark-900/50 hover:bg-dark-900/80 border border-white/5 hover:border-brand-indigo/30 transition-all rounded-lg py-1.5 px-3 flex items-center space-x-2 text-xs text-gray-200"
                        title="Click to view QR code"
                      >
                        <Ticket className="w-3.5 h-3.5 text-brand-cyan" />
                        <span className="font-bold">Row {t.seat.row} - Seat {t.seat.number}</span>
                        {t.isCheckedIn && <span className="text-[9px] bg-green-500/15 border border-green-500/30 text-green-400 px-1 rounded">Checked In</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side billing and actions */}
                <div className="bg-dark-900/40 p-6 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-between items-end md:min-w-[200px]">
                  <div className="text-right w-full">
                    <span className="text-[9px] text-gray-500 font-semibold block uppercase">Total Paid</span>
                    <span className="text-xl font-extrabold text-white">${booking.totalAmount}</span>
                  </div>

                  {!isCancelled && !isPast && (
                    <button
                      onClick={() => handleCancelBooking(booking.bookingId)}
                      disabled={cancellingId === booking.bookingId}
                      className="mt-4 md:mt-0 bg-transparent hover:bg-brand-rose/5 border border-brand-rose/20 text-brand-rose font-bold text-xs py-2 px-4 rounded-lg w-full transition-all text-center disabled:opacity-50"
                    >
                      {cancellingId === booking.bookingId ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm p-6 text-center rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-transparent"
            >
              <span>&times;</span>
            </button>

            <span className="text-[10px] font-bold text-brand-cyan uppercase bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">
              {selectedTicket.seat.tier}
            </span>
            <h3 className="text-xl font-bold text-white mt-3">Row {selectedTicket.seat.row} - Seat {selectedTicket.seat.number}</h3>
            <p className="text-xs text-gray-400 mt-1">{selectedTicket.event.title}</p>

            <div className="my-6 bg-white p-3 rounded-xl inline-block shadow-sm">
              {qrUrl ? (
                <img src={qrUrl} alt="Signed Security Token" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-xs">Loading QR...</div>
              )}
            </div>

            <div className="bg-dark-900/60 border border-white/5 rounded-xl p-3.5 text-[11px] text-gray-400 leading-normal flex items-start space-x-2 text-left">
              <AlertTriangle className="w-4 h-4 text-brand-cyan shrink-0" />
              <span>Present this QR Code to the gate scanner. The encoded JWT signature secures your ticket authenticity.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Tickets;
