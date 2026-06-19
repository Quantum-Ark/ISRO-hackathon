import { useMemo, useState } from 'react';
import { formatUTC } from '../lib/data';

export default function HardnessMeter({ data, fluxData }) {
  const [hover, setHover] = useState(null);
  
  const chartData = useMemo(() => {
    if (!fluxData || fluxData.length === 0) return [];
    const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
    return fluxData.filter(d => d.timestamp >= twoHoursAgo);
  }, [fluxData]);

  const cw = 500, ch = 140, pad = { t: 12, r: 40, b: 24, l: 45 };

  const scales = useMemo(() => {
    if (!chartData.length) return null;
    const t0 = chartData[0].timestamp, t1 = chartData[chartData.length - 1].timestamp;
    const rMin = 0, rMax = 0.15;
    const thr = 0.06;
    const thrY = pad.t + ch - pad.t - pad.b - ((thr - rMin) / (rMax - rMin)) * (ch - pad.t - pad.b);
    return {
      x: t => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (cw - pad.l - pad.r),
      y: r => pad.t + ch - pad.t - pad.b - ((r - rMin) / (rMax - rMin)) * (ch - pad.t - pad.b),
      thrY,
      thr,
      t0, t1
    };
  }, [chartData]);

  const closestPoint = useMemo(() => {
    if (!hover || !chartData.length || !scales) return null;
    let closest = chartData[0];
    let minDiff = Math.abs(chartData[0].timestamp - hover.t);
    for (const p of chartData) {
      const diff = Math.abs(p.timestamp - hover.t);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest;
  }, [hover, chartData, scales]);

  if (!scales || !chartData.length) {
    return (
      <div className="bg-[#161B22]/70 border border-[#30363D] rounded-lg h-full flex flex-col justify-center items-center p-6 text-center select-none">
        <span className="text-[#8B949E] text-xs font-mono">Hardness indicator initializing...</span>
      </div>
    );
  }

  const firstX = scales.x(chartData[0].timestamp);
  const lastX = scales.x(chartData[chartData.length - 1].timestamp);

  const pathLine = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${scales.x(d.timestamp)},${scales.y(d.hardnessRatio)}`).join(' ');
  const pathArea = `${pathLine} L${lastX},${ch - pad.b} L${firstX},${ch - pad.b} Z`;

  const xticks = 4;
  const xtickVals = Array.from({ length: xticks + 1 }, (_, i) => {
    const t = scales.t0 + (i / xticks) * (scales.t1 - scales.t0);
    return { x: scales.x(t), label: new Date(t).toISOString().slice(11, 16) };
  });

  return (
    <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg h-full flex flex-col overflow-hidden shadow-lg relative group">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50 select-none">
        <div className="flex items-center gap-2">
          <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
            Spectral Hardness Ratio
          </h2>
          <span className="text-[9px] text-[#484F58] font-mono">(Neupert Effect Pre-Flare Signal)</span>
        </div>
        
        {/* Real-time values overlay */}
        <div className="flex items-center gap-4 text-[9px] font-mono text-[#8B949E]">
          <span>CURRENT: <span className={`font-bold ${data.trend === 'rising' ? 'text-orange-400' : 'text-[#3FB950]'}`}>{data.current.toFixed(3)}</span></span>
          <span className="hidden sm:inline">BASELINE: <span>{data.baseline.toFixed(3)}</span></span>
          <span className="hidden sm:inline">THRESHOLD: <span className="text-orange-400">{data.threshold.toFixed(3)}</span></span>
          {data.preFlareSignal && (
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse">
              PRE-FLARE DETECTED: +{data.minutesEarly}m EARLY
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="p-3 flex-1 overflow-hidden relative">
        <svg viewBox={`0 0 ${cw} ${ch}`} className="w-full h-full">
          <defs>
            <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F85149" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F85149" stopOpacity="0.0" />
            </linearGradient>
            <filter id="hrGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#F85149" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Reference alarm zone backdrop (above threshold) */}
          <rect x={pad.l} y={0} width={cw - pad.l - pad.r} height={scales.thrY} fill="rgba(248,81,73,0.015)" />

          {/* Horizontal grid lines */}
          {[0.03, 0.06, 0.09, 0.12].map(val => (
            <line 
              key={`hgrid-${val}`}
              x1={pad.l} 
              y1={scales.y(val)} 
              x2={cw - pad.r} 
              y2={scales.y(val)} 
              stroke="#30363D" 
              strokeWidth={0.5} 
              strokeDasharray="2,3" 
            />
          ))}

          {/* Vertical grid lines at time ticks */}
          {xtickVals.map((t, idx) => (
            <line 
              key={`vgrid-${idx}`}
              x1={t.x} 
              y1={pad.t} 
              x2={t.x} 
              y2={ch - pad.b} 
              stroke="#30363D" 
              strokeWidth={0.5} 
              strokeDasharray="2,3" 
            />
          ))}

          {/* Threshold alert line */}
          <line x1={pad.l} y1={scales.thrY} x2={cw - pad.r} y2={scales.thrY} stroke="#D29922" strokeWidth={1} strokeDasharray="4,3" />
          <text x={cw - pad.r + 4} y={scales.thrY + 3} fill="#D29922" fontSize={8} fontWeight="bold" fontFamily="monospace">THR</text>

          {/* Axes lines */}
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={ch - pad.b} stroke="#30363D" strokeWidth={1} />
          <line x1={pad.l} y1={ch - pad.b} x2={cw - pad.r} y2={ch - pad.b} stroke="#30363D" strokeWidth={1} />

          {/* X ticks labels */}
          {xtickVals.map((t, i) => (
            <text key={i} x={t.x} y={ch - pad.b + 14} textAnchor="middle" fill="#8B949E" fontSize={8} fontFamily="monospace">{t.label}</text>
          ))}

          {/* Data Line & Area Gradient Fill */}
          <path d={pathArea} fill="url(#hrGrad)" />
          <path d={pathLine} fill="none" stroke="#F85149" strokeWidth={1.5} filter="url(#hrGlow)" />

          {/* Hover Crosshair & Dot */}
          {closestPoint && (
            <g>
              <line 
                x1={scales.x(closestPoint.timestamp)} 
                y1={pad.t} 
                x2={scales.x(closestPoint.timestamp)} 
                y2={ch - pad.b} 
                stroke="#8B949E" 
                strokeWidth={0.5} 
                strokeDasharray="2,2" 
              />
              <circle cx={scales.x(closestPoint.timestamp)} cy={scales.y(closestPoint.hardnessRatio)} r={3.5} fill="#F85149" stroke="#fff" strokeWidth={1} />
            </g>
          )}

          {/* Interactive Mouse Region */}
          <rect 
            x={pad.l} 
            y={pad.t} 
            width={cw - pad.l - pad.r} 
            height={ch - pad.t - pad.b} 
            fill="transparent"
            onMouseMove={e => {
              const r = e.currentTarget.getBoundingClientRect();
              const sx = (e.clientX - r.left) / r.width;
              setHover({ x: pad.l + sx * (cw - pad.l - pad.r), t: scales.t0 + sx * (scales.t1 - scales.t0) });
            }}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {closestPoint && (
          <div className="absolute top-2 left-16 bg-[#0D1117]/90 backdrop-blur-md border border-[#30363D] px-2.5 py-1.5 rounded shadow-2xl font-mono text-[9px] space-y-1 text-[#8B949E] z-10 select-none">
            <div className="text-white border-b border-[#30363D]/60 pb-1 mb-1 font-bold text-center">
              {formatUTC(closestPoint.timestamp)}
            </div>
            <div className="flex justify-between gap-6">
              <span>HARDNESS RATIO:</span>
              <span className="text-[#F85149] font-bold">
                {closestPoint.hardnessRatio.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span>THRESHOLD:</span>
              <span className="text-[#D29922] font-semibold">
                {scales.thr.toFixed(3)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
