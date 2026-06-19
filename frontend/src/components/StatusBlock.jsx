import { useLiveState, formatUTC } from '../lib/data';

export default function StatusBlock() {
  const { nowcast, forecast, systemStatus } = useLiveState();
  
  const phase = nowcast.currentPhase || 'Quiet Sun';
  const isWatch = phase.includes('Warning') || phase.includes('Elevated');
  const isFlare = phase.includes('Onset') || phase.includes('Peak') || phase.includes('Decay') || nowcast.class !== '—';
  
  let stateColor = 'bg-[#3FB950]';
  let stateText = 'text-[#3FB950]';
  let stateBorder = 'border-[#3FB950]/30';
  let stateGlow = 'shadow-[#3FB950]/10';

  if (isFlare) {
    stateColor = 'bg-[#F85149]';
    stateText = 'text-[#F85149]';
    stateBorder = 'border-[#F85149]/30';
    stateGlow = 'shadow-[#F85149]/20';
  } else if (isWatch) {
    stateColor = 'bg-[#D29922]';
    stateText = 'text-[#D29922]';
    stateBorder = 'border-[#D29922]/30';
    stateGlow = 'shadow-[#D29922]/15';
  }

  return (
    <div className={`bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg h-full flex flex-col overflow-hidden shadow-lg transition-all duration-300 ${stateBorder} ${stateGlow}`}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50 select-none">
        <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
          Mission Status
        </h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stateColor}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${stateColor}`} />
          </span>
          <span className={`text-[10px] font-bold uppercase font-mono tracking-wide ${stateText}`}>
            {phase}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 flex-1 flex flex-col gap-3 select-none">
        {/* Nowcast Card */}
        <div className="bg-[#0D1117]/60 border border-[#30363D] rounded p-2.5 relative overflow-hidden group hover:border-[#8B949E]/30 transition-all duration-200">
          <div className="text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1">
            Nowcast Engine
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono tracking-tighter ${stateText} drop-shadow-[0_0_8px_rgba(230,126,34,0.1)]`}>
              {nowcast.class}
            </span>
            {isFlare && (
              <span className="text-[9px] uppercase font-bold font-mono text-red-500 animate-pulse">
                ONGOING FLUX
              </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1 border-t border-[#30363D]/40 pt-1.5 font-mono text-[10px] text-[#8B949E]">
            <div className="flex justify-between">
              <span>PEAK FLUX:</span>
              <span className="text-[#E6EDF3]">{nowcast.peakFlux.toExponential(1)} W/m²</span>
            </div>
            <div className="flex justify-between">
              <span>Z-SCORE:</span>
              <span className={`font-semibold ${isWatch || isFlare ? 'text-orange-400' : 'text-[#8B949E]'}`}>
                {nowcast.zScore.toFixed(1)}σ
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-[#484F58]">
              <span>ADAPTIVE THRESHOLD:</span>
              <span>{nowcast.adaptiveThreshold.toFixed(1)}σ</span>
            </div>
          </div>
        </div>

        {/* Forecast Card */}
        <div className="bg-[#0D1117]/60 border border-[#30363D] rounded p-2.5 hover:border-[#8B949E]/30 transition-all duration-200">
          <div className="text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1">
            Forecast (3-Hr Window)
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-[#E6EDF3]">
              {forecast.probability}%
            </span>
            <span className="text-[9px] font-mono text-[#484F58] uppercase">probability</span>
          </div>

          {/* Progress Gauge */}
          <div className="mt-2">
            <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  forecast.probability > 75 
                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                    : forecast.probability > 45 
                      ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' 
                      : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                }`}
                style={{ width: `${forecast.probability}%` }}
              />
            </div>
          </div>

          <div className="mt-2 space-y-1 font-mono text-[9px] text-[#8B949E]">
            <div className="flex justify-between">
              <span>TARGET CLASS:</span>
              <span className="text-[#E6EDF3] font-semibold">{forecast.nextClass || 'M-class'}</span>
            </div>
            <div className="flex justify-between">
              <span>EST. LEAD TIME:</span>
              <span className="text-orange-400 font-bold">{forecast.leadTime || 0} min</span>
            </div>
          </div>
        </div>

        {/* System Flags */}
        <div className="mt-auto space-y-1 font-mono text-[10px] text-[#8B949E]">
          <div className="flex justify-between items-center border-b border-[#30363D]/40 pb-1">
            <span>PIPELINE ENGINE:</span>
            <span className="px-1 py-0.5 rounded text-[8px] bg-green-500/10 text-[#3FB950] border border-[#3FB950]/20 font-bold uppercase">
              {systemStatus.pipeline === 'Operational' ? 'ONLINE' : systemStatus.pipeline}
            </span>
          </div>
          <div className="flex justify-between items-center text-[9px]">
            <span>NOAA GOES FEED:</span>
            <span className="text-[#3FB950] font-bold">● ACTIVE</span>
          </div>
          <div className="flex justify-between items-center text-[9px]">
            <span>CNN/TCN MODEL:</span>
            <span className="text-[#E6EDF3]">v{systemStatus.modelVersion} (TCN-8L)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
