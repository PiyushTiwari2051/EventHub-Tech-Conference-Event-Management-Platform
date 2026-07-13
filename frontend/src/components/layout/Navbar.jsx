import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Ticket, LogOut, LayoutDashboard, User } from 'lucide-react';

export const Navbar = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('events')}>
        <div className="p-2 bg-brand-indigo/10 text-brand-indigo rounded-lg border border-brand-indigo/20">
          <Ticket className="w-6 h-6 animate-pulse" />
        </div>
        <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-brand-indigo to-brand-cyan bg-clip-text text-transparent">
          NovaReserve
        </span>
      </div>

      {user && (
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex space-x-2">
            <button
              onClick={() => setCurrentTab('events')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'events'
                  ? 'bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/35'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/35'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            {user.role === 'attendee' && (
              <button
                onClick={() => setCurrentTab('tickets')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                  currentTab === 'tickets'
                    ? 'bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/35'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>My Tickets</span>
              </button>
            )}
            {user.role === 'organizer' && (
              <button
                onClick={() => setCurrentTab('checkin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'checkin'
                    ? 'bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/35'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                QR Check-In
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4 border-l border-white/5 pl-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo border border-brand-indigo/25">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-gray-200 leading-tight">{user.name}</p>
                <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-brand-rose hover:bg-brand-rose/5 rounded-lg border border-transparent hover:border-brand-rose/20 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
