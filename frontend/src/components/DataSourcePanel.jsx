import { useLiveState, transferLearning } from '../lib/data';

export default function DataSourcePanel() {
  const { systemStatus } = useLiveState();

  return (
    <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg h-full flex flex-col overflow-hidden shadow-lg select-none">
      <div className="px-4 py-2.5 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50">
        <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
          Instruments & Orbit
        </h2>
        <span className="text-[9px] font-mono text-green-400 font-bold uppercase">Ready</span>
      </div>
      
      <div className="p-3.5 flex-1 overflow-y-auto space-y-2.5 font-mono text-[9px] text-[#8B949E]">
        {/* Live Satellite Sources */}
        <div className="bg-[#0D1117]/60 border border-[#30363D]/60 rounded p-2">
          <div className="text-[8px] uppercase font-bold text-orange-400 mb-1">
            Active Satellite Ingestion
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#E6EDF3] font-bold">Aditya-L1 (ISRO)</span>
            <span className="text-[#566176] text-[8px]">Lagrange Point L1</span>
          </div>
          <div className="pl-2 space-y-0.5 border-l border-[#30363D] text-[#8B949E] mt-1 text-[8px]">
            <div>• SoLEXS: Soft X-Ray (1-30 keV) — <span className="text-orange-400">Thermal</span></div>
            <div>• HEL1OS: Hard X-Ray (10-150 keV) — <span className="text-[#3498DB]">Impulsive</span></div>
          </div>
        </div>

        {/* NOAA GOES Calibration */}
        <div className="bg-[#0D1117]/60 border border-[#30363D]/60 rounded p-2">
          <div className="text-[8px] uppercase font-bold text-orange-400 mb-1">
            Live Reference Calibration
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#E6EDF3] font-bold">NOAA GOES Primary</span>
            <span className="text-[#566176] text-[8px]">Geostationary</span>
          </div>
          <div className="pl-2 border-l border-[#30363D] text-[#8B949E] mt-1 text-[8px]">
            Channels: 1-8 Å (Soft) / 0.5-4 Å (Hard)
          </div>
        </div>

        {/* Transfer learning pipeline */}
        <div className="bg-[#0D1117]/60 border border-[#30363D]/60 rounded p-2">
          <div className="text-[8px] uppercase font-bold text-orange-400 mb-1">
            Transfer Learning Pipeline
          </div>
          <div className="space-y-0.5 text-[8px] text-[#8B949E]">
            <div>• Source Domain: <span className="text-[#E6EDF3]">{transferLearning.source}</span></div>
            <div>• Target Domain: <span className="text-[#E6EDF3]">{transferLearning.target}</span></div>
            <div>• Domain adaptation: <span className="text-[#E6EDF3]">{transferLearning.domainAdaptation}</span></div>
          </div>
        </div>

        {/* forecasting model */}
        <div className="bg-[#0D1117]/60 border border-[#30363D]/60 rounded p-2">
          <div className="text-[8px] uppercase font-bold text-orange-400 mb-1">
            Neural Forecast Architecture
          </div>
          <div className="space-y-0.5 text-[8px] text-[#8B949E]">
            <div>• Algorithm: Temporal Convolutional Net (TCN-8L)</div>
            <div>• Layers: 8 (dilated causal convolutions)</div>
            <div>• Inputs: Dual-band aligned feature trajectory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
