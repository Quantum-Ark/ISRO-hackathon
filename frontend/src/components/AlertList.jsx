import { formatUTC } from '../lib/data';

const LEVEL_STYLES = { 
  RED: { border: 'border-l-[3px] border-red-500', text: 'text-red-400', bg: 'bg-red-500/5', dot: 'bg-red-500', glow: 'rgba(248,81,73,0.15)' }, 
  YELLOW: { border: 'border-l-[3px] border-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/5', dot: 'bg-yellow-500', glow: 'rgba(210,153,34,0.15)' }, 
  GREEN: { border: 'border-l-[3px] border-green-500', text: 'text-green-400', bg: 'bg-green-500/5', dot: 'bg-green-500', glow: 'rgba(63,185,80,0.15)' } 
};
const TYPE_ABBR = { NOWCAST: 'NOWCAST', FORECAST: 'FORECAST', INFO: 'SYS_INFO' };

export default function AlertList({ alerts }) {
  const displayAlerts = alerts.slice(0, 20);
  
  return (
    <div 
      className="glass-card h-full flex flex-col"
      style={{ overflow: 'hidden' }}
    >
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[#0D1117]/30">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-red-500 to-yellow-500" />
          <h2 className="text-[10px] sm:text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
            Alert Log
          </h2>
        </div>
        <span className="text-[8px] sm:text-[9px] font-mono text-[#566176] uppercase">
          {alerts.length > 0 ? `${alerts.length} alerts` : 'Live Feed'}
        </span>
      </div>
      
      <div className="p-2 sm:p-2.5 flex-1 overflow-y-auto space-y-1.5 font-mono text-[9px] sm:text-[10px]">
        {displayAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#566176] gap-2 py-8">
            <div className="w-8 h-8 rounded-full border-2 border-[#30363D] flex items-center justify-center text-xs">
              ✓
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider">No active alerts</span>
            <span className="text-[8px] text-center max-w-[180px]">All systems nominal — no anomalous solar activity detected</span>
          </div>
        ) : (
          displayAlerts.map((a, i) => {
            const s = LEVEL_STYLES[a.level] || LEVEL_STYLES.GREEN;
            return (
              <div 
                key={i} 
                className={`p-2.5 rounded-lg ${s.border} ${s.bg} border-t border-r border-b border-[rgba(255,255,255,0.04)] transition-all duration-200 hover:bg-[#21262D]/30`}
              >
                <div className="flex items-center justify-between mb-1 text-[8px] sm:text-[9px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} style={{ boxShadow: `0 0 6px ${s.glow}` }} />
                    <span className={`${s.text} uppercase tracking-wider`}>
                      [{TYPE_ABBR[a.type] || a.type}]
                    </span>
                  </div>
                  <span className="text-[#566176] font-normal">
                    {a.ts ? a.ts.slice(11, 19) : ''} UTC
                  </span>
                </div>
                <div className="text-[#8B949E] text-[9px] sm:text-[10px] leading-relaxed break-words pl-3">
                  {a.msg}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
