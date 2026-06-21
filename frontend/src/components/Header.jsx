import { useState } from 'react';
import { useLiveState } from '../lib/data';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◉' },
  { key: 'replay', label: 'Replay', icon: '▶' },
  { key: 'catalog', label: 'Catalog', icon: '☰' },
  { key: 'metrics', label: 'Metrics', icon: '◈' },
];

export default function Header({ view, onView, time }) {
  const { systemStatus } = useLiveState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOnline = systemStatus.pipeline !== 'Disconnected (Offline)';

  const handleView = (v) => {
    onView(v);
    setMobileMenuOpen(false);
  };

  return (
    <header style={{ 
      flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      height: 'var(--header-h)',
      background: 'rgba(13, 17, 23, 0.85)',
      backdropFilter: 'blur(16px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
    }}>
      <div className="flex items-center justify-between h-full px-3 sm:px-5">
        {/* ===== Left: Branding ===== */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Static logo dot */}
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[#E67E22]" />

          {/* Brand text */}
          <span className="text-xs sm:text-sm font-bold font-mono tracking-widest text-[#E67E22] uppercase truncate">
            SOLFLARE
          </span>

          {/* Source tag */}
          <span className="hidden md:inline-flex px-1.5 py-0.5 text-[8px] rounded font-mono text-[#566176] border border-[rgba(255,255,255,0.06)]">
            Aditya-L1
          </span>
        </div>

        {/* ===== Center: Desktop Nav ===== */}
        <nav className="hidden md:flex items-center bg-[#0D1117]/40 p-0.5 border border-[rgba(255,255,255,0.04)] rounded-lg gap-0.5">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleView(key)}
              className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-3 sm:px-4 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                view === key
                  ? 'bg-[#E67E22] text-white font-bold'
                  : 'text-[#566176] hover:text-[#D4DCE6] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ===== Right: Clock ===== */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[9px] text-[#566176] font-mono hidden lg:inline">
              {isOnline ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Latency */}
          <div className="hidden xl:flex items-center gap-1.5 border-l border-[rgba(255,255,255,0.06)] pl-3">
            <span className="text-[9px] text-[#566176] font-mono">{systemStatus.dataLatency}</span>
          </div>

          {/* Clock */}
          <div className="text-[10px] sm:text-[11px] font-mono text-[#566176] select-none truncate max-w-[130px] sm:max-w-none">
            {time.toISOString().replace('T', ' ').slice(0, 19)} UTC
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center w-7 h-7 rounded bg-[rgba(255,255,255,0.04)] text-[#566176] hover:text-[#D4DCE6] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="text-xs">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(255,255,255,0.04)]" style={{ background: 'rgba(13, 17, 23, 0.95)' }}>
          <div className="grid grid-cols-2 gap-1 p-2">
            {NAV_ITEMS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleView(key)}
                className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                  view === key
                    ? 'bg-[#E67E22] text-white font-bold'
                    : 'text-[#566176] hover:text-[#D4DCE6] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
