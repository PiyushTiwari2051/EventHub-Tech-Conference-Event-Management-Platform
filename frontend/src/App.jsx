import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/layout/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { EventDetails } from './pages/EventDetails';
import { Tickets } from './pages/Tickets';
import { CheckIn } from './pages/CheckIn';
import { HelpCircle, RefreshCw } from 'lucide-react';

const queryClient = new QueryClient();

export const App = () => {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('events'); // 'events', 'dashboard', 'tickets', 'checkin'
  const [activeEventId, setActiveEventId] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  // Validate authentication session on app start
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-950 space-y-4">
        <div className="w-12 h-12 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest animate-pulse">Initializing Gateways...</p>
      </div>
    );
  }

  // Not authenticated flow
  if (!isAuthenticated) {
    return showRegister ? (
      <Register onToggleLogin={() => setShowRegister(false)} />
    ) : (
      <Login onToggleRegister={() => setShowRegister(true)} />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-dark-950 text-gray-100 flex flex-col selection:bg-brand-indigo/30 selection:text-white">
        {/* Navigation header */}
        <Navbar currentTab={currentTab} setCurrentTab={(tab) => {
          setCurrentTab(tab);
          // If we navigate away from discovery tab, clear active event detail focus
          if (tab !== 'events') {
            setActiveEventId(null);
          }
        }} />

        {/* Content canvas container */}
        <main className="flex-1 w-full animate-fadeIn">
          {currentTab === 'events' && (
            activeEventId ? (
              <EventDetails eventId={activeEventId} onBack={() => setActiveEventId(null)} />
            ) : (
              <Dashboard onSelectEvent={(id) => {
                setActiveEventId(id);
                setCurrentTab('events');
              }} />
            )
          )}

          {currentTab === 'dashboard' && (
            <Dashboard onSelectEvent={(id) => {
              setActiveEventId(id);
              setCurrentTab('events');
            }} />
          )}

          {currentTab === 'tickets' && user.role === 'attendee' && (
            <Tickets />
          )}

          {currentTab === 'checkin' && user.role === 'organizer' && (
            <CheckIn />
          )}
        </main>

        {/* Dynamic global notification status footer */}
        <footer className="w-full glass border-t border-white/5 py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-500 gap-y-2">
          <span>&copy; 2026 NovaReserve Corp. All rights reserved. Code A Nova Task 4.</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse block" />
              <span>Real-Time socket room stream connected</span>
            </span>
            <span className="text-gray-400">codeanova26@gmail.com</span>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
};
export default App;
