import { useLiveState } from '../lib/data';

export default function Header({ view, onView, time }) {
  const { systemStatus } = useLiveState();
  const isOnline = systemStatus.pipeline !== 'Disconnected (Offline)';

  return (
    <header className="bg-[#0D1117]/90 backdrop-blur-md border-b border-[#30363D] px-6 h-12 flex items-center justify-between shrink-0 select-none">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-orange-500 opacity-20 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold font-mono tracking-widest text-[#E67E22] uppercase">
            HELIOS-CORTEX
          </span>
          <span className="text-[9px] text-[#8B949E] tracking-wider font-mono">
            Space Weather Monitoring Platform
          </span>
        </div>
        <div className="h-5 w-[1px] bg-[#30363D]" />
        <div className="px-1.5 py-0.5 text-[9px] rounded font-mono border border-[#30363D] text-[#8B949E] bg-[#161B22]">
          NOAA GOES
        </div>
      </div>

      {/* Center: Tabs */}
      <nav className="flex bg-[#161B22] p-0.5 border border-[#30363D] rounded-md gap-0.5">
        {['dashboard', 'replay', 'catalog', 'metrics'].map(v => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-4 py-1 rounded transition-all duration-200 cursor-pointer ${
              view === v
                ? 'bg-[#E67E22] text-white shadow-md shadow-[#E67E22]/10 font-bold'
                : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
            }`}
          >
            {v}
          </button>
        ))}
      </nav>

      {/* Right: Sync Status and Monospace clock */}
      <div className="flex items-center gap-5">
        {/* Status flags */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-[10px] text-[#8B949E] font-mono tracking-wide">
              {isOnline ? 'SATELLITE SYNC' : 'OFFLINE'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-[#30363D] pl-4">
            <span className="text-[10px] text-[#8B949E] font-mono">
              LATENCY: <span className="text-[#E6EDF3]">{systemStatus.dataLatency}</span>
            </span>
          </div>
        </div>

        {/* Monospace Clock */}
        <div className="bg-[#161B22] border border-[#30363D] px-2.5 py-1 rounded text-[11px] font-mono text-[#8B949E] tracking-wider select-none">
          {time.toISOString().replace('T', ' ').slice(0, 19)} UTC
        </div>
      </div>
    </header>
  );
}
