import { useLiveState, transferLearning } from '../lib/data';

export default function DataSourcePanel() {
  const { systemStatus } = useLiveState();

  return (
    <div 
      className="glass-card h-full flex flex-col"
      style={{ overflow: 'hidden' }}
    >
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[#0D1117]/30">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#3498DB] to-[#2ECC71]" />
          <h2 className="text-[10px] sm:text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
            Instruments
          </h2>
        </div>
        <span className="text-[7px] sm:text-[8px] font-mono text-green-400 font-bold uppercase flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" style={{ boxShadow: '0 0 6px rgba(63,185,80,0.6)' }} />
          Ready
        </span>
      </div>
      
      <div className="p-3 sm:p-3.5 flex-1 overflow-y-auto space-y-2 sm:space-y-2.5 font-mono text-[8px] sm:text-[9px] text-[#8B949E]">
        {/* Live Satellite Sources */}
        <div className="bg-[#0D1117]/30 border border-[rgba(255,255,255,0.04)] rounded-lg p-2.5 sm:p-3 hover:border-[rgba(255,255,255,0.08)] transition-all duration-200">
          <div className="text-[7px] sm:text-[8px] uppercase font-bold text-orange-400 mb-1.5 flex items-center gap-1.5">
            <span>●</span> Active Satellite
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#E6EDF3] font-bold text-[9px] sm:text-[10px]">Aditya-L1 (ISRO)</span>
            <span className="text-[#566176] text-[7px] sm:text-[8px]">L1 Point</span>
          </div>
          <div className="pl-2 space-y-1 border-l border-[rgba(255,255,255,0.06)] mt-1.5 text-[7px] sm:text-[8px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-[2px] bg-orange-400 rounded-full" />
              <span>SoLEXS: Soft X-Ray <span className="text-orange-400">(1-30 keV)</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-[2px] bg-[#3498DB] rounded-full" />
              <span>HEL1OS: Hard X-Ray <span className="text-[#3498DB]">(10-150 keV)</span></span>
            </div>
          </div>
        </div>

        {/* NOAA GOES Calibration */}
        <div className="bg-[#0D1117]/30 border border-[rgba(255,255,255,0.04)] rounded-lg p-2.5 sm:p-3 hover:border-[rgba(255,255,255,0.08)] transition-all duration-200">
          <div className="text-[7px] sm:text-[8px] uppercase font-bold text-[#3498DB] mb-1.5 flex items-center gap-1.5">
            <span>◈</span> Reference Calibration
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#E6EDF3] font-bold text-[9px] sm:text-[10px]">NOAA GOES</span>
            <span className="text-[#566176] text-[7px] sm:text-[8px]">Geostationary</span>
          </div>
          <div className="pl-2 border-l border-[rgba(255,255,255,0.06)] mt-1 text-[7px] sm:text-[8px]">
            Channels: 1-8 Å (Soft) / 0.5-4 Å (Hard)
          </div>
        </div>

        {/* Transfer Learning */}
        <div className="bg-[#0D1117]/30 border border-[rgba(255,255,255,0.04)] rounded-lg p-2.5 sm:p-3 hover:border-[rgba(255,255,255,0.08)] transition-all duration-200">
          <div className="text-[7px] sm:text-[8px] uppercase font-bold text-purple-400 mb-1.5 flex items-center gap-1.5">
            <span>◇</span> Transfer Learning
          </div>
          <div className="space-y-1 text-[7px] sm:text-[8px]">
            <div className="flex justify-between">
              <span className="text-[#566176]">Source:</span>
              <span className="text-[#8B949E]">{transferLearning.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#566176]">Target:</span>
              <span className="text-[#8B949E]">{transferLearning.target}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#566176]">Adaptation:</span>
              <span className="text-[#8B949E]">{transferLearning.domainAdaptation}</span>
            </div>
          </div>
        </div>

        {/* Neural Architecture */}
        <div className="bg-[#0D1117]/30 border border-[rgba(255,255,255,0.04)] rounded-lg p-2.5 sm:p-3 hover:border-[rgba(255,255,255,0.08)] transition-all duration-200">
          <div className="text-[7px] sm:text-[8px] uppercase font-bold text-[#2ECC71] mb-1.5 flex items-center gap-1.5">
            <span>◆</span> Neural Architecture
          </div>
          <div className="space-y-1 text-[7px] sm:text-[8px]">
            <div className="flex justify-between">
              <span className="text-[#566176]">Algorithm:</span>
              <span className="text-[#8B949E]">TCN-8L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#566176]">Layers:</span>
              <span className="text-[#8B949E]">8 dilated causal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#566176]">Input:</span>
              <span className="text-[#8B949E]">Dual-band feature trajectory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
