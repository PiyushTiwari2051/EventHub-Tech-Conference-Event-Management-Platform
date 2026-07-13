import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { Calendar, MapPin, Users, Ticket, CreditCard, ChevronRight, X, Clock, HelpCircle } from 'lucide-react';

export const EventDetails = ({ eventId, onBack }) => {
  const user = useAuthStore((state) => state.user);
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState('select'); // 'select', 'pay', 'success'
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [timers, setTimers] = useState({});

  // 1. Fetch Event and Initial Seat Map
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const eventData = await api.get(`/events/${eventId}`);
        setEvent(eventData);

        const seatData = await api.get(`/events/${eventId}/seats`);
        setSeats(seatData);
      } catch (err) {
        console.error('Failed to load event details:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  // 2. Handle Socket Events
  const handleSeatStatusChange = (data) => {
    const { seatId, status, heldBy, heldUntil } = data;
    setSeats((prevSeats) =>
      prevSeats.map((seat) => {
        if (seat._id === seatId) {
          return { ...seat, status, heldBy, heldUntil };
        }
        return seat;
      })
    );

    // If held by self, set up countdown timer
    if (status === 'held' && heldBy === user._id) {
      const remainingSeconds = Math.max(0, Math.floor((new Date(heldUntil) - new Date()) / 1000));
      setTimers((prev) => ({ ...prev, [seatId]: remainingSeconds }));
    } else {
      // Remove timer if released or booked
      setTimers((prev) => {
        const copy = { ...prev };
        delete copy[seatId];
        return copy;
      });
      setSelectedSeats((prev) => prev.filter((s) => s._id !== seatId));
    }
  };

  const { holdSeat, releaseSeat } = useSocket(eventId, handleSeatStatusChange);

  // Countdown timer clock ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = {};
        let changed = false;
        Object.keys(prev).forEach((id) => {
          if (prev[id] > 0) {
            updated[id] = prev[id] - 1;
            changed = true;
          } else {
            // Timer expired, seat released automatically by server/TTL
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSeatClick = (seat) => {
    if (seat.status === 'available') {
      holdSeat(seat._id);
      setSelectedSeats((prev) => [...prev, seat]);
    } else if (seat.status === 'held' && seat.heldBy === user._id) {
      releaseSeat(seat._id);
      setSelectedSeats((prev) => prev.filter((s) => s._id !== seat._id));
    }
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((total, seat) => {
      const tier = event.priceTiers.find((t) => t.name === seat.tier);
      return total + (tier ? tier.price : 0);
    }, 0);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setLoading(true);

    try {
      const payload = {
        eventId,
        seatIds: selectedSeats.map((s) => s._id),
        paymentMethod: cardNumber === '4000 0000 0000 0000' ? 'fail' : 'mock_credit_card',
      };

      const res = await api.post('/bookings', payload);
      setBookingResult(res);
      setSelectedSeats([]);
      setTimers({});
      setBookingStep('success');
    } catch (err) {
      setBookingError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group seats by rows for seating layout
  const rows = {};
  seats.forEach((seat) => {
    if (!rows[seat.row]) {
      rows[seat.row] = [];
    }
    rows[seat.row].push(seat);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative">
      <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center space-x-1.5 mb-8 bg-transparent">
        <span>&larr;</span> <span>Back to Events</span>
      </button>

      {event && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Event details & interactive map */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass p-6 md:p-8 rounded-2xl">
              <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider bg-brand-cyan/10 px-3 py-1 rounded-full border border-brand-cyan/20">
                Live Status
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-4">{event.title}</h1>
              <p className="text-gray-400 mt-4 leading-relaxed">{event.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Calendar className="w-5 h-5 text-brand-indigo" />
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Date & Time</p>
                    <p className="text-sm font-medium">{new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <MapPin className="w-5 h-5 text-brand-indigo" />
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Venue Location</p>
                    <p className="text-sm font-medium">{event.venue}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <Users className="w-5 h-5 text-brand-indigo" />
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Total Capacity</p>
                    <p className="text-sm font-medium">{event.capacity} seats</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seating Grid Map container */}
            {bookingStep === 'select' && (
              <div className="glass p-6 md:p-8 rounded-2xl overflow-x-auto">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">STAGE / FRONT</h3>
                  <div className="w-2/3 h-1.5 bg-gradient-to-r from-transparent via-brand-indigo to-transparent mx-auto mt-2 rounded-full shadow-glow-brand" />
                </div>

                {/* Grid chart */}
                <div className="min-w-[600px] flex flex-col items-center space-y-4">
                  {Object.keys(rows).sort().map((rowName) => (
                    <div key={rowName} className="flex items-center space-x-4">
                      <span className="w-6 text-sm font-bold text-gray-500 text-center">{rowName}</span>
                      <div className="flex items-center space-x-2.5">
                        {rows[rowName].map((seat) => {
                          const isSelectedBySelf = seat.status === 'held' && seat.heldBy === user._id;
                          const isHeldByOther = seat.status === 'held' && seat.heldBy !== user._id;
                          const isBooked = seat.status === 'booked';
                          
                          let bgClass = 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/35';
                          if (isBooked) {
                            bgClass = 'bg-brand-rose/25 border-brand-rose/40 text-brand-rose cursor-not-allowed';
                          } else if (isHeldByOther) {
                            bgClass = 'bg-brand-violet/25 border-brand-violet/40 text-brand-violet cursor-not-allowed';
                          } else if (isSelectedBySelf) {
                            bgClass = 'bg-amber-500/30 border-amber-500/60 text-amber-300 ring-2 ring-amber-500/20';
                          }

                          return (
                            <button
                              key={seat._id}
                              onClick={() => handleSeatClick(seat)}
                              disabled={isBooked || isHeldByOther}
                              className={`w-10 h-10 rounded-lg border flex flex-col items-center justify-center font-bold text-xs transition-all relative ${bgClass}`}
                              title={`${seat.tier} - Row ${seat.row} Seat ${seat.number}`}
                            >
                              <span>{seat.number}</span>
                              {isSelectedBySelf && timers[seat._id] !== undefined && (
                                <span className="absolute -bottom-1.5 bg-amber-500 text-dark-950 font-extrabold text-[8px] px-1 rounded flex items-center space-x-0.5 shadow-sm">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{timers[seat._id]}s</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-6 text-sm font-bold text-gray-500 text-center">{rowName}</span>
                    </div>
                  ))}
                </div>

                {/* Seating Guide */}
                <div className="flex justify-center space-x-6 mt-10 border-t border-white/5 pt-6 flex-wrap gap-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-3.5 h-3.5 rounded bg-green-500/20 border border-green-500/40 block" />
                    <span className="text-gray-400">Available</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-3.5 h-3.5 rounded bg-amber-500/30 border border-amber-500/60 block" />
                    <span className="text-gray-400">Held (You - 2 min lock)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-3.5 h-3.5 rounded bg-brand-violet/25 border border-brand-violet/40 block" />
                    <span className="text-gray-400">Held by Others</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-3.5 h-3.5 rounded bg-brand-rose/25 border border-brand-rose/40 block" />
                    <span className="text-gray-400">Booked</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pay Step Panel */}
            {bookingStep === 'pay' && (
              <div className="glass p-6 md:p-8 rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Mock Checkout Transaction</h3>
                  <button onClick={() => setBookingStep('select')} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {bookingError && (
                  <div className="bg-brand-rose/10 border border-brand-rose/20 text-brand-rose p-4 rounded-lg text-sm mb-6 flex items-center space-x-2.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-brand-indigo/40"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Card Number
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                        <CreditCard className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-brand-indigo/40"
                        placeholder="4000 1234 5678 9010"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Tip: Enter <code className="text-brand-rose">4000 0000 0000 0000</code> to test payment processing failure.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Expiration Date
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-brand-indigo/40"
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        CVV / CVC Code
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 px-4 text-sm text-gray-200 focus:outline-none focus:border-brand-indigo/40"
                        placeholder="•••"
                        maxLength="3"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg py-3 font-semibold text-sm transition-all shadow-glow-brand flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ${calculateTotal()} Now</span>
                  </button>
                </form>
              </div>
            )}

            {/* Success Booking Details */}
            {bookingStep === 'success' && bookingResult && (
              <div className="glass p-6 md:p-8 rounded-2xl text-center space-y-6 animate-fadeIn">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Ticket className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Booking Completed Successfully!</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Your seats are locked and tickets are prepared. Transaction reference:{' '}
                    <span className="text-brand-cyan font-bold">{bookingResult.booking.transactionId}</span>
                  </p>
                </div>

                <div className="border-t border-b border-white/5 py-6 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-left">Your Tickets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookingResult.tickets.map((t, idx) => {
                      const seatObj = seats.find((s) => s._id === t.seat);
                      return (
                        <div key={t._id} className="bg-dark-900/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden">
                          <div>
                            <span className="text-[10px] font-bold text-brand-indigo uppercase bg-brand-indigo/10 px-2 py-0.5 rounded border border-brand-indigo/20">
                              {seatObj?.tier || 'General'}
                            </span>
                            <h5 className="text-lg font-bold text-white mt-2">Seat {seatObj?.row}-{seatObj?.number}</h5>
                            <p className="text-xs text-gray-500 mt-1">Ticket Reference ID: {t._id}</p>
                          </div>
                          
                          {/* QR Code Container */}
                          <div className="my-4 bg-white p-2.5 rounded-lg">
                            {/* Fetch Base64 QR Image */}
                            <QRImage ticketId={t._id} />
                          </div>

                          <span className="text-[9px] text-gray-500 max-w-[200px] break-all leading-tight">
                            Verify security token signature at venue scan gates.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={onBack}
                  className="px-6 py-2.5 bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg font-semibold text-sm transition-all"
                >
                  Return to Event Discovery
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Reservation Cart checkout panel */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl space-y-6">
              <h3 className="text-lg font-bold text-white">Booking Summary</h3>
              {selectedSeats.length === 0 ? (
                <div className="text-center py-6 text-gray-500 space-y-2">
                  <HelpCircle className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No seats selected yet. Click available seats on the chart to start.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[220px] overflow-y-auto space-y-2">
                    {selectedSeats.map((seat) => {
                      const tier = event.priceTiers.find((t) => t.name === seat.tier);
                      return (
                        <div key={seat._id} className="flex justify-between items-center p-2.5 bg-dark-900/50 border border-white/5 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500">{seat.tier}</p>
                            <p className="text-sm font-bold text-white">Seat {seat.row}-{seat.number}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-semibold text-brand-cyan">${tier?.price}</span>
                            <button
                              onClick={() => handleSeatClick(seat)}
                              className="text-gray-500 hover:text-brand-rose bg-transparent p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Price</span>
                    <span className="text-xl font-extrabold text-white">${calculateTotal()}</span>
                  </div>

                  {bookingStep === 'select' && (
                    <button
                      onClick={() => setBookingStep('pay')}
                      className="w-full bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg py-3 font-semibold text-sm transition-all shadow-glow-brand flex items-center justify-center space-x-1"
                    >
                      <span>Proceed to Payment</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="glass p-5 rounded-2xl text-xs text-gray-500 space-y-2.5">
              <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Reservation Holds Policy</p>
              <p>Selected seats are locked for exactly 2 minutes to allow completing your transaction details.</p>
              <p>Unfinished checkout transactions will automatically release the seats back for public availability.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Helper to render base64 QR Image dynamically
const QRImage = ({ ticketId }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const res = await api.get(`/tickets/${ticketId}/qr`);
        setQrUrl(res.qrCodeUrl);
      } catch (err) {
        console.error('QR fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQR();
  }, [ticketId]);

  if (loading) {
    return <div className="w-32 h-32 flex items-center justify-center bg-dark-900 border rounded-lg text-gray-500 text-[10px]">Loading QR...</div>;
  }

  return <img src={qrUrl} alt="Security Check-in Token QR" className="w-32 h-32" />;
};

export default EventDetails;
