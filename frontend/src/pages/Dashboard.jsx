import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { Calendar, MapPin, Users, Plus, ShieldCheck, Ticket, Download, Radio, Send, Bell } from 'lucide-react';

export const Dashboard = ({ onSelectEvent }) => {
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'analytics' (for organizers)
  const [search, setSearch] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');

  // Create Event Form state (Organizer)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [vipCapacity, setVipCapacity] = useState(10);
  const [vipPrice, setVipPrice] = useState(150);
  const [genCapacity, setGenCapacity] = useState(30);
  const [genPrice, setGenPrice] = useState(60);

  // Selected event for analytics/announcements/rosters (Organizer)
  const [selectedAnalyticsEventId, setSelectedAnalyticsEventId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcements, setAnnouncements] = useState([]);

  // Load Events on startup
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (venue) query.push(`venue=${encodeURIComponent(venue)}`);
      if (date) query.push(`date=${encodeURIComponent(date)}`);
      const url = `/events?${query.join('&')}`;
      const data = await api.get(url);
      setEvents(data);
      if (data.length > 0 && !selectedAnalyticsEventId) {
        setSelectedAnalyticsEventId(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to query events:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, venue, date]);

  // Load Analytics, roster, and announcements when organizer selects an event
  useEffect(() => {
    if (user.role !== 'organizer' || !selectedAnalyticsEventId) return;

    const fetchAnalyticsAndRoster = async () => {
      try {
        const stats = await api.get(`/analytics/${selectedAnalyticsEventId}`);
        setAnalyticsData(stats);

        const list = await api.get(`/analytics/${selectedAnalyticsEventId}/roster`);
        setRoster(list);

        const announce = await api.get(`/analytics/${selectedAnalyticsEventId}/announcements`);
        setAnnouncements(announce);
      } catch (err) {
        console.error('Analytics load error:', err.message);
      }
    };

    fetchAnalyticsAndRoster();
  }, [selectedAnalyticsEventId, user.role]);

  // Create Event Submit (Organizer)
  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    try {
      const priceTiers = [
        { name: 'VIP Ticket', price: Number(vipPrice), capacity: Number(vipCapacity) },
        { name: 'General Admission', price: Number(genPrice), capacity: Number(genCapacity) },
      ];
      const payload = {
        title: newEventTitle,
        description: newEventDesc,
        date: new Date(newEventDate),
        venue: newEventVenue,
        capacity: Number(vipCapacity) + Number(genCapacity),
        priceTiers,
      };

      await api.post('/events', payload);
      setShowCreateModal(false);
      // Reset state
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventDate('');
      setNewEventVenue('');
      fetchEvents();
    } catch (err) {
      alert(err.message || 'Failed to create event');
    }
  };

  // Broadcast announcement to event room
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;

    try {
      await api.post(`/analytics/${selectedAnalyticsEventId}/announcements`, {
        message: announcementMsg,
      });
      setAnnouncementMsg('');
      // Reload announcements list
      const announce = await api.get(`/analytics/${selectedAnalyticsEventId}/announcements`);
      setAnnouncements(announce);
    } catch (err) {
      alert(err.message || 'Failed to send announcement');
    }
  };

  const downloadCSV = () => {
    window.open(`http://localhost:5000/api/analytics/${selectedAnalyticsEventId}/roster/csv?token=${localStorage.getItem('token')}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-white/5 pb-8 mb-8 gap-y-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Event Control Portal</h1>
          <p className="text-sm text-gray-400 mt-1">
            {user.role === 'organizer'
              ? 'Analyze bookings, broadcast news, and audit scanned QR check-ins'
              : 'Browse trending music events, technical conferences, and register tickets'}
          </p>
        </div>

        {user.role === 'organizer' && (
          <div className="flex items-center space-x-3">
            <div className="flex rounded-lg bg-dark-900/60 p-1 border border-white/5">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'events' ? 'bg-brand-indigo text-white shadow' : 'text-gray-400'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'analytics' ? 'bg-brand-indigo text-white shadow' : 'text-gray-400'
                }`}
              >
                Analytics Hub
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg px-4 py-2 text-xs font-semibold flex items-center space-x-1 shadow-glow-brand"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Organizer Analytics Dashboard View */}
      {user.role === 'organizer' && activeTab === 'analytics' ? (
        <div className="space-y-8">
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Active Event</label>
            <select
              value={selectedAnalyticsEventId}
              onChange={(e) => setSelectedAnalyticsEventId(e.target.value)}
              className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none"
            >
              {events.map((e) => (
                <option key={e._id} value={e._id}>{e.title}</option>
              ))}
            </select>
          </div>

          {analyticsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Stat card 1 */}
              <div className="glass p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase">Gross Revenue</span>
                <h4 className="text-2xl font-extrabold text-white mt-2">${analyticsData.summary.totalRevenue}</h4>
                <p className="text-[10px] text-green-400 font-bold uppercase mt-1">Processed Payments</p>
              </div>
              {/* Stat card 2 */}
              <div className="glass p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase">Tickets Booked</span>
                <h4 className="text-2xl font-extrabold text-white mt-2">{analyticsData.summary.totalSold} / {analyticsData.event.capacity}</h4>
                <p className="text-[10px] text-brand-cyan font-bold uppercase mt-1">{analyticsData.summary.soldPercentage}% sales capacity</p>
              </div>
              {/* Stat card 3 */}
              <div className="glass p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase">Gate Scanned (Entry)</span>
                <h4 className="text-2xl font-extrabold text-white mt-2">{analyticsData.summary.totalCheckedIn} checked in</h4>
                <p className="text-[10px] text-brand-violet font-bold uppercase mt-1">Real-time attendance</p>
              </div>
              {/* Stat card 4 */}
              <div className="glass p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">Action Items</span>
                <button
                  onClick={downloadCSV}
                  className="bg-brand-indigo/10 hover:bg-brand-indigo/25 text-brand-indigo rounded-lg py-2 border border-brand-indigo/20 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 mt-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Attendee CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* Revenue and Seating Capacity Charts */}
          {analyticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CSS Bar Chart for Revenue breakdown */}
              <div className="lg:col-span-2 glass p-6 rounded-2xl">
                <h3 className="text-base font-bold text-white mb-6">Revenue Breakdown per Ticket Tier</h3>
                <div className="space-y-4">
                  {analyticsData.tiers.map((tier) => (
                    <div key={tier.tierName}>
                      <div className="flex justify-between text-xs text-gray-400 font-semibold mb-1">
                        <span>{tier.tierName} (${tier.price})</span>
                        <span className="text-brand-cyan">${tier.revenue} ({tier.sold} sold)</span>
                      </div>
                      <div className="w-full bg-dark-950 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-brand-indigo to-brand-cyan h-2.5 rounded-full"
                          style={{ width: `${tier.capacity > 0 ? (tier.sold / tier.capacity) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Announcements Section */}
              <div className="glass p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-1">
                    <Radio className="w-4 h-4 text-brand-rose animate-pulse" />
                    <span>Live Announcements</span>
                  </h3>
                  <p className="text-xs text-gray-400">Broadcast updates to active booking screens in real time.</p>
                </div>

                <div className="flex-1 max-h-[160px] overflow-y-auto space-y-2.5 pr-2">
                  {announcements.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No announcements sent.</p>
                  ) : (
                    announcements.map((a) => (
                      <div key={a._id} className="bg-dark-950 p-2.5 border border-white/5 rounded-lg text-xs">
                        <p className="text-gray-300">{a.message}</p>
                        <span className="text-[10px] text-gray-500 block mt-1">
                          {new Date(a.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendAnnouncement} className="flex space-x-2 border-t border-white/5 pt-3">
                  <input
                    type="text"
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                    className="flex-1 bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-gray-200 focus:outline-none"
                    placeholder="E.g., Event starting in 15 mins..."
                    required
                  />
                  <button
                    type="submit"
                    className="bg-brand-rose text-white rounded-lg p-2.5 flex items-center justify-center hover:bg-brand-rose/90"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Roster Table */}
          {analyticsData && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-base font-bold text-white">Attendee Reservation Ledger</h3>
                <p className="text-xs text-gray-400 mt-1">Detailed list of seat holders and check-in statuses.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-dark-900/40 text-gray-400 font-semibold uppercase tracking-wider border-b border-white/5">
                      <th className="p-4">Attendee Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 text-center">Seat Coordinates</th>
                      <th className="p-4 text-center">Ticket Tier</th>
                      <th className="p-4 text-center">Check-In Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {roster.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-gray-500">No seats reserved for this event.</td>
                      </tr>
                    ) : (
                      roster.map((ticket) => (
                        <tr key={ticket._id} className="hover:bg-white/5">
                          <td className="p-4 text-white font-bold">{ticket.user.name}</td>
                          <td className="p-4 text-gray-400">{ticket.user.email}</td>
                          <td className="p-4 text-center font-bold text-brand-cyan">Row {ticket.seat.row} - Seat {ticket.seat.number}</td>
                          <td className="p-4 text-center">
                            <span className="bg-brand-indigo/10 border border-brand-indigo/25 text-brand-indigo font-bold px-2 py-0.5 rounded">
                              {ticket.seat.tier}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                ticket.isCheckedIn
                                  ? 'bg-green-500/10 border border-green-500/35 text-green-400'
                                  : 'bg-amber-500/10 border border-amber-500/35 text-amber-400'
                              }`}
                            >
                              {ticket.isCheckedIn ? 'Entered Gate' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Event Discovery / Listing (Both roles read, organizer lists all, attendee filters) */
        <div className="space-y-8">
          {/* Discovery Filter Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass rounded-xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search event title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-dark-950/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by venue..."
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-dark-950/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-dark-950/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-gray-200 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                setSearch('');
                setVenue('');
                setDate('');
              }}
              className="bg-transparent text-gray-400 border border-white/5 rounded-lg text-xs font-semibold py-2 hover:bg-white/5 transition-all"
            >
              Reset Filters
            </button>
          </div>

          {/* Catalog grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p>No matching events found. Please try a different query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="glass rounded-2xl overflow-hidden flex flex-col justify-between border-white/5 hover:border-white/15 transition-all duration-300"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-brand-cyan uppercase bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">
                        {event.venue.split(',')[1] || event.venue}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white leading-snug">{event.title}</h3>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{event.description}</p>
                    </div>

                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <div className="flex items-center text-[11px] text-gray-400 space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-indigo" />
                        <span>
                          {new Date(event.date).toLocaleDateString()} at{' '}
                          {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center text-[11px] text-gray-400 space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-indigo" />
                        <span>{event.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-900/40 p-4 border-t border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-gray-500 font-semibold block uppercase">Starting from</span>
                      <span className="text-sm font-extrabold text-white">
                        ${Math.min(...event.priceTiers.map((t) => t.price))}
                      </span>
                    </div>
                    <button
                      onClick={() => onSelectEvent(event._id)}
                      className="bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-all shadow-glow-brand"
                    >
                      Reserve Seats
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL (Organizer Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-xl p-6 md:p-8 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white rounded-lg bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">Create New Event Layout</h3>

            <form onSubmit={handleCreateEventSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Event Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none"
                  placeholder="E.g., Neon Beats concert"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  rows="3"
                  className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none"
                  placeholder="Explain event agenda details..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Venue Location</label>
                  <input
                    type="text"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none"
                    placeholder="Building name, City"
                    required
                  />
                </div>
              </div>

              {/* Price tiers configuration */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Configure Price Tiers</span>
                
                <div className="grid grid-cols-2 gap-4 bg-dark-900/40 p-4 border border-white/5 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">VIP Tier Seats</label>
                    <input
                      type="number"
                      value={vipCapacity}
                      onChange={(e) => setVipCapacity(e.target.value)}
                      className="w-full bg-dark-950 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-gray-200"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">VIP Ticket Price ($)</label>
                    <input
                      type="number"
                      value={vipPrice}
                      onChange={(e) => setVipPrice(e.target.value)}
                      className="w-full bg-dark-950 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-gray-200"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-dark-900/40 p-4 border border-white/5 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">General Tier Seats</label>
                    <input
                      type="number"
                      value={genCapacity}
                      onChange={(e) => setGenCapacity(e.target.value)}
                      className="w-full bg-dark-950 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-gray-200"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">General Price ($)</label>
                    <input
                      type="number"
                      value={genPrice}
                      onChange={(e) => setGenPrice(e.target.value)}
                      className="w-full bg-dark-950 border border-white/5 rounded-lg py-1.5 px-3 text-xs text-gray-200"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg py-3 font-semibold text-sm transition-all shadow-glow-brand"
              >
                Publish Event Layout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG icons or custom components
const X = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default Dashboard;
