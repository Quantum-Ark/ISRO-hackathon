import { formatUTC } from '../lib/data';

const LEVEL_CLASSES = { 
  RED: { border: 'border-l-2 border-red-500', text: 'text-red-500', bg: 'bg-red-500/5' }, 
  YELLOW: { border: 'border-l-2 border-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/5' }, 
  GREEN: { border: 'border-l-2 border-green-500', text: 'text-green-500', bg: 'bg-green-500/5' } 
};
const TYPE_ABBR = { NOWCAST: 'NOWCAST', FORECAST: 'FORECAST', INFO: 'SYS_INFO' };

export default function AlertList({ alerts }) {
  const displayAlerts = alerts.slice(0, 20);
  
  return (
    <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg h-full flex flex-col overflow-hidden shadow-lg select-none">
      <div className="px-4 py-2.5 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50">
        <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
          Security Log
        </h2>
        <span className="text-[9px] font-mono text-[#566176] uppercase">Real-Time Alerts</span>
      </div>
      <div className="p-2.5 flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px]">
        {displayAlerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#566176] text-[10px] uppercase font-mono py-8">
            No active threat logs
          </div>
        ) : (
          displayAlerts.map((a, i) => {
            const styles = LEVEL_CLASSES[a.level] || LEVEL_CLASSES.GREEN;
            return (
              <div 
                key={i} 
                className={`p-2 rounded ${styles.border} ${styles.bg} border-t border-r border-b border-[#30363D]/30 transition-all duration-200 hover:border-[#8B949E]/20`}
              >
                <div className="flex items-center justify-between mb-1 text-[9px] font-bold">
                  <span className={`${styles.text} uppercase tracking-wider`}>
                    [{TYPE_ABBR[a.type] || a.type}]
                  </span>
                  <span className="text-[#566176]">
                    {a.ts ? a.ts.slice(11, 19) : ''} UTC
                  </span>
                </div>
                <div className="text-[#8B949E] text-[10px] leading-relaxed break-words">{a.msg}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
