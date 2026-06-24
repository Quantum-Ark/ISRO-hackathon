import { useMemo, useState, useCallback } from 'react';
import { formatUTC } from '../lib/data';

export default function HardnessMeter({ data, fluxData }) {
  const [hover, setHover] = useState(null);
  const [dimensions, setDimensions] = useState({ w: 500, h: 140 });
  const cw = dimensions.w, ch = dimensions.h;
  const pad = { t: 12, r: 40, b: 24, l: 42 };

  const containerRef = useCallback((node) => {
    if (node) {
      const w = Math.max(300, node.clientWidth - 24);
      const aspect = w / 500;
      setDimensions({ w, h: Math.round(140 * aspect) });
    }
  }, []);

  const chartData = useMemo(() => {
    if (!fluxData || fluxData.length === 0) return [];
    const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
    return fluxData.filter(d => d.timestamp >= twoHoursAgo);
  }, [fluxData]);

  const scales = useMemo(() => {
    if (!chartData.length) return null;
    const t0 = chartData[0].timestamp, t1 = chartData[chartData.length - 1].timestamp;
    const rMin = 0, rMax = 0.15;
    const thr = 0.06;
    const thrY = pad.t + ch - pad.t - pad.b - ((thr - rMin) / (rMax - rMin)) * (ch - pad.t - pad.b);
    return {
      x: t => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (cw - pad.l - pad.r),
      y: r => pad.t + ch - pad.t - pad.b - ((r - rMin) / (rMax - rMin)) * (ch - pad.t - pad.b),
      thrY, thr, t0, t1
    };
  }, [chartData, cw, ch]);

  const handleMouseMove = useCallback((e, scalesVal) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHover({ x: pad.l + sx * (cw - pad.l - pad.r), t: scalesVal.t0 + sx * (scalesVal.t1 - scalesVal.t0) });
  }, [cw]);

  const closestPoint = useMemo(() => {
    if (!hover || !chartData.length || !scales) return null;
    let closest = chartData[0];
    let minDiff = Math.abs(chartData[0].timestamp - hover.t);
    for (const p of chartData) {
      const diff = Math.abs(p.timestamp - hover.t);
      if (diff < minDiff) { minDiff = diff; closest = p; }
    }
    return closest;
  }, [hover, chartData, scales]);

  if (!scales || !chartData.length) {
    return (
      <div className="glass-card h-full flex flex-col justify-center items-center p-6 text-center select-none">
        <div className="w-8 h-8 rounded-full border-2 border-[#30363D] border-t-[#F85149] animate-spin mb-2" />
        <span className="text-[#8B949E] text-xs font-mono">Hardness indicator initializing...</span>
      </div>
    );
  }

  const firstX = scales.x(chartData[0].timestamp);
  const lastX = scales.x(chartData[chartData.length - 1].timestamp);
  const pathLine = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${scales.x(d.timestamp)},${scales.y(d.hardnessRatio)}`).join(' ');
  const pathArea = `${pathLine} L${lastX},${ch - pad.b} L${firstX},${ch - pad.b} Z`;

  const nTicks = cw < 400 ? 3 : 4;
  const xtickVals = Array.from({ length: nTicks + 1 }, (_, i) => {
    const t = scales.t0 + (i / nTicks) * (scales.t1 - scales.t0);
    return { x: scales.x(t), label: new Date(t).toISOString().slice(11, 16) };
  });

  return (
    <div 
      className="h-full flex flex-col relative"
      style={{ overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="dash-card-header">
        <div className="dash-card-header-left">
          <div className="dash-card-bar" style={{ background: 'linear-gradient(180deg, #F87171, #FBBF24)' }} />
          <span className="dash-card-title">Spectral Hardness</span>
          <span className="dash-card-sub">Pre-flare signal</span>
        </div>
        
        {/* Real-time values */}
        <div className="flex items-center gap-2 sm:gap-4 text-[8px] sm:text-[9px] font-mono text-[#8B949E] flex-wrap">
          <span className="flex items-center gap-1">
            <span className="text-[#566176]">NOW:</span>
            <span className={`font-bold ${data.trend === 'rising' ? 'text-orange-400' : 'text-[#3FB950]'}`}>{data.current.toFixed(3)}</span>
          </span>
          <span className="hidden md:flex items-center gap-1">
            <span className="text-[#566176]">BASELINE:</span>
            <span>{data.baseline.toFixed(3)}</span>
          </span>
          {data.preFlareSignal && (
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1 text-[7px] sm:text-[8px]">
              <span>⚠</span>
              <span>+{data.minutesEarly}m EARLY</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG */}
      <div ref={containerRef} className="dash-card-body flex-1 overflow-hidden relative">
        <svg viewBox={`0 0 ${cw} ${ch}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F85149" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F85149" stopOpacity="0.01" />
            </linearGradient>
            <filter id="hrGlow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#F85149" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Alert zone backdrop */}
          <rect x={pad.l} y={0} width={cw - pad.l - pad.r} height={scales.thrY} fill="rgba(248,81,73,0.02)" rx="2" />

          {/* Horizontal grid */}
          {[0.03, 0.06, 0.09, 0.12].map(val => (
            <line key={`h-${val}`} x1={pad.l} y1={scales.y(val)} x2={cw - pad.r} y2={scales.y(val)} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} strokeDasharray="3,4" />
          ))}

          {/* Y-axis labels */}
          {[0.03, 0.06, 0.09, 0.12].map(val => (
            <text key={`yl-${val}`} x={pad.l - 6} y={scales.y(val) + 2} textAnchor="end" fill="#566176" fontSize={7} fontFamily="monospace">
              {val.toFixed(2)}
            </text>
          ))}

          {/* Vertical grid */}
          {xtickVals.map((t, i) => (
            <line key={`v-${i}`} x1={t.x} y1={pad.t} x2={t.x} y2={ch - pad.b} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} strokeDasharray="3,4" />
          ))}

          {/* Threshold line */}
          <line x1={pad.l} y1={scales.thrY} x2={cw - pad.r} y2={scales.thrY} stroke="#D29922" strokeWidth={1} strokeDasharray="4,3" />
          <text x={cw - pad.r + 3} y={scales.thrY + 3} fill="#D29922" fontSize={7} fontFamily="monospace" fontWeight="bold">THR</text>

          {/* Axes */}
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={ch - pad.b} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <line x1={pad.l} y1={ch - pad.b} x2={cw - pad.r} y2={ch - pad.b} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* X ticks */}
          {xtickVals.map((t, i) => (
            <text key={i} x={t.x} y={ch - pad.b + 14} textAnchor="middle" fill="#566176" fontSize={7} fontFamily="monospace">{t.label}</text>
          ))}

          {/* Data */}
          <path d={pathArea} fill="url(#hrGrad)" />
          <path d={pathLine} fill="none" stroke="#F85149" strokeWidth={1.5} filter="url(#hrGlow)" />

          {/* Hover */}
          {closestPoint && (
            <g>
              <line x1={scales.x(closestPoint.timestamp)} y1={pad.t} x2={scales.x(closestPoint.timestamp)} y2={ch - pad.b} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="2,3" />
              <circle cx={scales.x(closestPoint.timestamp)} cy={scales.y(closestPoint.hardnessRatio)} r={4} fill="#F85149" stroke="#fff" strokeWidth={1.5}>
                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          <rect 
            x={pad.l} y={pad.t} width={cw - pad.l - pad.r} height={ch - pad.t - pad.b}
            fill="transparent"
            onMouseMove={e => handleMouseMove(e, scales)}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {closestPoint && (
          <div className="absolute top-1 left-2 bg-[#0D1117]/90 backdrop-blur-md border border-[rgba(255,255,255,0.08)] px-2 py-1.5 rounded-lg shadow-2xl font-mono text-[8px] sm:text-[9px] space-y-1 text-[#8B949E] z-10 select-none">
            <div className="text-white border-b border-[rgba(255,255,255,0.06)] pb-0.5 mb-0.5 font-bold text-center text-[9px] sm:text-[10px]">
              {formatUTC(closestPoint.timestamp)}
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#566176]">HARDNESS:</span>
              <span className="text-[#F85149] font-bold">{closestPoint.hardnessRatio.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#566176]">THRESHOLD:</span>
              <span className="text-[#D29922] font-semibold">{scales.thr.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
