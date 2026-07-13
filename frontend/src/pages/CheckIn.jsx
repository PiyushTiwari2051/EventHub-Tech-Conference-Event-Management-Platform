import React, { useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, AlertTriangle, ScanLine, KeyRound, Radio } from 'lucide-react';

export const CheckIn = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  // Web Audio API beep sound generator (successful scan)
  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime); // High pitch frequency
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // Beep duration 150ms
    } catch (err) {
      console.warn('Audio play block:', err.message);
    }
  };

  const handleVerifyCheckIn = async (tokenToVerify) => {
    if (!tokenToVerify) return;
    setLoading(true);
    setError('');
    setScanResult(null);

    try {
      const res = await api.post('/tickets/verify', { qrToken: tokenToVerify });
      setScanResult(res);
      playSuccessBeep();
      setTokenInput('');
    } catch (err) {
      setError(err.message || 'Check-in validation failed. Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerifyCheckIn(tokenInput);
  };

  // Mock Camera Scan simulator: Grabs a token from the user tickets list to simulate scan
  const handleSimulateCameraCapture = async () => {
    setError('');
    setScanResult(null);
    setLoading(true);
    try {
      // Fetch all tickets to find one that is NOT yet checked in
      const list = await api.get('/tickets');
      const unchecked = list.find((t) => !t.isCheckedIn);

      if (!unchecked) {
        throw new Error('No unchecked tickets available in the system to simulate scan.');
      }

      // Simulate a small visual delay for camera autofocus
      setTimeout(() => {
        handleVerifyCheckIn(unchecked.qrToken);
      }, 1000);
    } catch (err) {
      setError(err.message || 'Simulation error');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="border-b border-white/5 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white">QR Validation Gate</h1>
        <p className="text-sm text-gray-400 mt-1">Verify signed security tokens via camera feed simulation or manual security entry.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Camera Scanner Simulation */}
        <div className="glass p-6 rounded-2xl flex flex-col justify-between items-center text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-brand-rose animate-pulse" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Simulated Camera Active</span>
          </div>

          <div className="w-full aspect-video bg-dark-900 border border-white/5 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
            {/* Scan animation lines */}
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
              <ScanLine className="w-24 h-24 text-brand-indigo animate-bounce" />
            </div>
            
            {loading && !tokenInput ? (
              <div className="space-y-2 relative z-10 text-center">
                <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-brand-cyan font-bold tracking-widest uppercase">Reading QR Payload...</p>
              </div>
            ) : (
              <div className="space-y-1 relative z-10 p-4">
                <p className="text-sm font-semibold text-gray-300">Mock Camera Feed</p>
                <p className="text-[10px] text-gray-500 max-w-[220px] mx-auto">Click simulation below to simulate scanning a ticket under the camera lens.</p>
              </div>
            )}

            {/* Glowing scan target overlay */}
            <div className="absolute inset-y-10 inset-x-16 border border-dashed border-white/10 rounded-xl pointer-events-none" />
          </div>

          <button
            onClick={handleSimulateCameraCapture}
            disabled={loading}
            className="w-full bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg py-2.5 font-semibold text-xs transition-all shadow-glow-brand"
          >
            Simulate QR Code Scan
          </button>
        </div>

        {/* Right Column: Verification Status & Manual Input */}
        <div className="space-y-6">
          {/* Status Display Area */}
          <div className="glass p-6 rounded-2xl min-h-[160px] flex flex-col justify-center items-center text-center">
            {scanResult ? (
              <div className="space-y-3 animate-fadeIn">
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Access Granted</h4>
                  <p className="text-xs text-gray-400 mt-1">Attendee: <span className="text-white font-bold">{scanResult.attendee}</span></p>
                  <p className="text-xs text-gray-400">Seat Location: <span className="text-brand-cyan font-bold">{scanResult.seat}</span></p>
                  <p className="text-[10px] text-gray-500 mt-2">{scanResult.event}</p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-3 animate-shake">
                <div className="w-12 h-12 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-brand-rose">Access Denied</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 space-y-1">
                <ScanLine className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-medium">Awaiting Token Scan</p>
                <p className="text-[10px]">Results of the verification scanner will show up here.</p>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4 text-brand-indigo" />
              <span>Manual Entry Bypass</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Paste Signed QR Code Token
                </label>
                <textarea
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  rows="3"
                  className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-indigo/40"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !tokenInput}
                className="w-full bg-brand-cyan hover:bg-brand-cyan/90 text-dark-950 rounded-lg py-2.5 font-bold text-xs transition-all shadow-glow-cyan disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Validate Entry'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CheckIn;
