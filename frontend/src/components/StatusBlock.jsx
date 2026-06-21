import { useLiveState } from '../lib/data';

export default function StatusBlock() {
  const { nowcast, forecast, systemStatus } = useLiveState();
  
  const phase = nowcast.currentPhase || 'Quiet Sun';
  const isWatch = phase.includes('Warning') || phase.includes('Elevated');
  const isFlare = phase.includes('Onset') || phase.includes('Peak') || phase.includes('Decay') || nowcast.class !== '—';
  
  let stateColor = 'bg-[#3FB950]';
  let stateText = 'text-[#3FB950]';
  let stateGlow = 'rgba(63,185,80,0.15)';

  if (isFlare) {
    stateColor = 'bg-[#F85149]';
    stateText = 'text-[#F85149]';
    stateGlow = 'rgba(248,81,73,0.25)';
  } else if (isWatch) {
    stateColor = 'bg-[#D29922]';
    stateText = 'text-[#D29922]';
    stateGlow = 'rgba(210,153,34,0.2)';
  }

  return (
    <div 
      className="glass-card h-full flex flex-col"
      style={{ boxShadow: `0 4px 24px ${stateGlow}`, position: 'relative', overflow: 'hidden' }}
    >
      
      {/* Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[#0D1117]/30 select-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: isFlare ? '#F85149' : isWatch ? '#D29922' : '#3FB950' }} />
          <h2 className="text-[10px] sm:text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
            Mission Status
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stateColor}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${stateColor}`} style={{ boxShadow: `0 0 8px ${stateGlow}` }} />
          </span>
          <span className={`text-[8px] sm:text-[10px] font-bold uppercase font-mono tracking-wide ${stateText}`}>
            {phase}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col gap-2 sm:gap-3 select-none overflow-y-auto">
        {/* Nowcast Card */}
        <div className="bg-[#0D1117]/40 border border-[rgba(255,255,255,0.05)] rounded-lg p-3 relative overflow-hidden group hover:border-[rgba(255,255,255,0.1)] transition-all duration-200">
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E67E22] via-[#F1C40F] to-[#E67E22] opacity-60" />
          
          <div className="text-[8px] sm:text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1.5 flex items-center gap-2">
            <span>Nowcast Engine</span>
            <span className="ai-badge text-[7px]">AI</span>
          </div>
          
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tighter ${stateText}`} style={{ textShadow: `0 0 20px ${stateGlow}` }}>
              {nowcast.class}
            </span>
            {isFlare && (
              <span className="text-[8px] sm:text-[9px] uppercase font-bold font-mono text-red-500 animate-pulse px-1.5 py-0.5 bg-red-500/10 rounded border border-red-500/20">
                FLARE IN PROGRESS
              </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1.5 border-t border-[rgba(255,255,255,0.05)] pt-2 font-mono text-[9px] sm:text-[10px] text-[#8B949E]">
            <div className="flex justify-between items-center">
              <span className="text-[#566176]">PEAK FLUX:</span>
              <span className="text-[#E6EDF3] font-semibold">{nowcast.peakFlux.toExponential(1)} <span className="text-[#566176] text-[8px]">W/m²</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#566176]">Z-SCORE:</span>
              <span className={`font-bold ${isWatch || isFlare ? 'text-orange-400' : 'text-[#8B949E]'}`}>
                {nowcast.zScore.toFixed(1)}<span className="text-[#566176] text-[8px]">σ</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-[#484F58]">
              <span>THRESHOLD:</span>
              <span>{nowcast.adaptiveThreshold.toFixed(1)}σ</span>
            </div>
            <div className="flex justify-between items-center text-[8px] sm:text-[9px] text-[#484F58]">
              <span>CONFIDENCE:</span>
              <span className="text-[#3FB950]">{(nowcast.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Forecast Card */}
        <div className="bg-[#0D1117]/40 border border-[rgba(255,255,255,0.05)] rounded-lg p-3 hover:border-[rgba(255,255,255,0.1)] transition-all duration-200">
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#3498DB] via-[#2ECC71] to-[#3498DB] opacity-40" style={{ position: 'relative', margin: '-12px -12px 10px -12px', borderRadius: '10px 10px 0 0' }} />
          
          <div className="text-[8px] sm:text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1.5 flex items-center gap-2">
            <span>Forecast (3-Hr Window)</span>
            <span className="ai-badge text-[7px]">TCN</span>
          </div>
          
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-black font-mono text-[#E6EDF3]">
              {forecast.probability}%
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono text-[#566176] uppercase">probability</span>
          </div>

          {/* Animated Progress Gauge */}
          <div className="mt-2.5">
            <div className="h-2 bg-[#0D1117]/60 rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{ 
                  width: `${forecast.probability}%`,
                  background: forecast.probability > 75 
                    ? 'linear-gradient(90deg, #E74C3C, #F85149)' 
                    : forecast.probability > 45 
                      ? 'linear-gradient(90deg, #E67E22, #F1C40F)' 
                      : 'linear-gradient(90deg, #3498DB, #2ECC71)',
                  boxShadow: forecast.probability > 45 ? '0 0 12px rgba(248,81,73,0.3)' : '0 0 12px rgba(52,152,219,0.3)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          <div className="mt-2.5 space-y-1.5 font-mono text-[8px] sm:text-[9px] text-[#8B949E]">
            <div className="flex justify-between items-center">
              <span className="text-[#566176]">TARGET CLASS:</span>
              <span className="text-[#E6EDF3] font-bold">{forecast.nextClass || 'M-class'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#566176]">EST. LEAD TIME:</span>
              <span className="text-orange-400 font-bold">{forecast.leadTime || 0} <span className="text-[#566176] text-[8px] font-normal">min</span></span>
            </div>
          </div>
        </div>

        {/* System Flags */}
        <div className="mt-auto space-y-1.5 font-mono text-[8px] sm:text-[10px] text-[#8B949E] pt-1">
          <div className="flex justify-between items-center py-1 border-b border-[rgba(255,255,255,0.05)]">
            <span className="text-[#566176]">PIPELINE:</span>
            <span className={`px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-bold uppercase ${
              systemStatus.pipeline === 'Operational' 
                ? 'bg-green-500/10 text-[#3FB950] border border-[#3FB950]/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {systemStatus.pipeline === 'Operational' ? '● ONLINE' : systemStatus.pipeline}
            </span>
          </div>
          <div className="flex justify-between items-center text-[8px] sm:text-[9px]">
            <span className="text-[#566176]">Aditya-L1:</span>
            <span className="text-[#3FB950] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" style={{ boxShadow: '0 0 6px rgba(63,185,80,0.6)' }} />
              SYNCED
            </span>
          </div>
          <div className="flex justify-between items-center text-[8px] sm:text-[9px]">
            <span className="text-[#566176]">MODEL:</span>
            <span className="text-[#E6EDF3] font-mono text-[9px]">TCN-8L v{systemStatus.modelVersion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
