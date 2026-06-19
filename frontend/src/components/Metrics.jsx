import { useState, useEffect } from 'react';

export default function Metrics() {
  const [m, setM] = useState(null);

  useEffect(() => {
    fetch(`http://${window.location.hostname}:8000/api/metrics`)
      .then(r => r.json())
      .then(data => {
        setM({
          podM: data.podM,
          farM: data.farM,
          csiM: data.csiM,
          podX: data.podX,
          farX: data.farX,
          csiX: data.csiX,
          lead: data.meanLeadTime,
          tp: data.confusion.tp,
          fn: data.confusion.fn,
          fp: data.confusion.fp,
          tn: data.confusion.tn,
          skill: data.skillScore,
          total: data.totalEvents,
          period: data.testPeriod
        });
      })
      .catch(err => console.error("Metrics API offline", err));
  }, []);

  if (!m) {
    return (
      <div className="bg-[#161B22]/70 border border-[#30363D] rounded-lg p-6 text-center select-none py-12">
        <span className="text-[#8B949E] text-xs font-mono">Loading model validation metrics...</span>
      </div>
    );
  }

  function MetricCard({ label, value, subtitle, colorClass = 'text-[#D4DCE6]', borderClass = 'border-[#30363D]/50' }) {
    return (
      <div className={`bg-[#0D1117]/60 border rounded p-3 select-none transition-all duration-200 hover:border-[#8B949E]/30 ${borderClass}`}>
        <div className="text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1">{label}</div>
        <div className={`text-xl font-bold font-mono ${colorClass}`}>{value}</div>
        {subtitle && <div className="text-[9px] text-[#566176] font-mono mt-1 leading-normal">{subtitle}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto py-3 select-none">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#30363D] pb-2">
        <h1 className="text-lg font-bold font-mono tracking-wider text-[#E6EDF3] uppercase">
          Model Validation & Backtest
        </h1>
        <span className="text-[10px] text-[#8B949E] font-mono">
          TEST PERIOD: <span className="text-white font-bold">{m.period}</span> · N={m.total} EVENTS
        </span>
      </div>

      {/* M-Class section */}
      <div className="space-y-2">
        <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-orange-400">
          M-Class & Above (Moderate Solar Storms)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="POD" value={m.podM.toFixed(2)} subtitle="Probability of Detection" colorClass="text-green-400" borderClass="border-green-500/20" />
          <MetricCard label="FAR" value={m.farM.toFixed(2)} subtitle="False Alarm Rate" colorClass={m.farM > 0.35 ? 'text-red-400' : 'text-yellow-400'} borderClass="border-orange-500/20" />
          <MetricCard label="CSI" value={m.csiM.toFixed(2)} subtitle="Critical Success Index" colorClass="text-blue-400" borderClass="border-blue-500/20" />
          <MetricCard label="Mean Lead Time" value={`+${m.lead} Min`} subtitle="Warning Advance vs GOES" colorClass="text-yellow-400" borderClass="border-yellow-500/20 animate-pulse" />
        </div>
      </div>

      {/* X-Class section */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-red-500">
          X-Class Events (Severe Space Weather)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="POD (Severe)" value={m.podX.toFixed(2)} subtitle="Severe Detection Prob." colorClass="text-green-400" borderClass="border-green-500/20" />
          <MetricCard label="FAR (Severe)" value={m.farX.toFixed(2)} subtitle="Severe False Alarm Rate" colorClass="text-green-400" borderClass="border-green-500/20" />
          <MetricCard label="CSI (Severe)" value={m.csiX.toFixed(2)} subtitle="Severe Critical Success Index" colorClass="text-blue-400" borderClass="border-blue-500/20" />
        </div>
      </div>

      {/* Grid: Confusion Matrix & Skill Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Confusion Matrix */}
        <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg p-4 shadow-xl md:col-span-2 space-y-3">
          <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-[#8B949E] border-b border-[#30363D]/40 pb-1.5">
            Confusion Matrix (2x2 Contingency Table)
          </h2>
          <div className="grid grid-cols-3 gap-2 max-w-md font-mono text-[10px]">
            <div />
            <div className="text-[#8B949E] font-bold text-center pb-1">PREDICTED +</div>
            <div className="text-[#8B949E] font-bold text-center pb-1">PREDICTED -</div>

            <div className="text-[#8B949E] font-bold flex items-center pr-2">ACTUAL +</div>
            <div className="bg-green-500/10 border border-green-500/30 rounded p-2.5 text-center transition-all hover:bg-green-500/15">
              <div className="text-lg font-black text-green-400">{m.tp}</div>
              <div className="text-[8px] text-[#566176] font-bold uppercase mt-0.5">True Positive (TP)</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded p-2.5 text-center transition-all hover:bg-red-500/15">
              <div className="text-lg font-black text-red-500">{m.fn}</div>
              <div className="text-[8px] text-[#566176] font-bold uppercase mt-0.5">False Negative (FN)</div>
            </div>

            <div className="text-[#8B949E] font-bold flex items-center pr-2">ACTUAL -</div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2.5 text-center transition-all hover:bg-yellow-500/15">
              <div className="text-lg font-black text-yellow-500">{m.fp}</div>
              <div className="text-[8px] text-[#566176] font-bold uppercase mt-0.5">False Positive (FP)</div>
            </div>
            <div className="bg-[#0D1117]/60 border border-[#30363D] rounded p-2.5 text-center transition-all hover:border-[#8B949E]/30">
              <div className="text-lg font-black text-[#E6EDF3]">{m.tn}</div>
              <div className="text-[8px] text-[#566176] font-bold uppercase mt-0.5">True Negative (TN)</div>
            </div>
          </div>
        </div>

        {/* Skill Score Circle Card */}
        <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg p-4 shadow-xl flex flex-col justify-between items-center text-center">
          <h2 className="text-xs uppercase font-mono tracking-wider font-bold text-[#8B949E] border-b border-[#30363D]/40 pb-1.5 w-full">
            Heidke Skill Score (HSS)
          </h2>
          <div className="my-auto py-4 space-y-2">
            <div className="text-4xl font-black font-mono text-blue-400 drop-shadow-[0_0_12px_rgba(52,152,219,0.2)]">
              {m.skill.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#8B949E] font-mono leading-relaxed px-2">
              HSS = {m.skill.toFixed(2)} vs GOES background cycle noise. Indicates high predictive performance above random chance.
            </div>
          </div>
          <div className="text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
            Climatology Validated
          </div>
        </div>
      </div>

      {/* Footer framework info */}
      <div className="bg-[#0D1117]/40 border border-[#30363D]/60 rounded-lg p-3 font-mono text-[9px] text-[#566176] leading-relaxed">
        <span className="text-[#8B949E] font-bold block mb-1">EVALUATION METRIC DEFINITIONS:</span>
        • <span className="text-[#8B949E]">POD (Probability of Detection)</span> ensures no flares fire without alarm coverage.<br />
        • <span className="text-[#8B949E]">FAR (False Alarm Rate)</span> measures reliability to prevent operator alarm desensitization in control rooms.<br />
        • <span className="text-[#8B949E]">CSI (Critical Success Index)</span> models overall operational safety, balancing POD and FAR.<br />
        • <span className="text-[#8B949E]">Mean Lead Time</span> calculates the exact minutes of advance warning available before GOES soft X-ray fluxes exceed flare classification threshold levels.
      </div>
    </div>
  );
}
