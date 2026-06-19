import { useMemo, useState } from 'react';
import { fmtFlux, formatUTC } from '../lib/data';

export default function FluxChart({ data, range, onRange }) {
  const [hover, setHover] = useState(null);
  const cw = 700, ch = 200, pad = { t: 16, r: 50, b: 30, l: 55 };

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = now - range * 3600 * 1000;
    return data.filter(d => d.timestamp >= cutoff);
  }, [data, range]);

  const scales = useMemo(() => {
    if (!filtered.length) return null;
    const t0 = filtered[0].timestamp, t1 = filtered[filtered.length - 1].timestamp;
    const fMin = 1e-10, fMax = 1e-3;
    return {
      x: t => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (cw - pad.l - pad.r),
      y: v => pad.t + ch - pad.t - pad.b - ((Math.log10(Math.max(1e-10, v)) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin))) * (ch - pad.t - pad.b),
      t0, t1,
    };
  }, [filtered]);

  const closestPoint = useMemo(() => {
    if (!hover || !filtered.length || !scales) return null;
    let closest = filtered[0];
    let minDiff = Math.abs(filtered[0].timestamp - hover.t);
    for (const p of filtered) {
      const diff = Math.abs(p.timestamp - hover.t);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest;
  }, [hover, filtered, scales]);

  if (!scales || !filtered.length) {
    return (
      <div className="bg-[#161B22]/70 border border-[#30363D] rounded-lg h-full flex flex-col justify-center items-center p-6 text-center select-none">
        <span className="text-[#8B949E] text-xs font-mono">Telemetry initializing...</span>
      </div>
    );
  }

  const tiers = [
    { y: scales.y(1e-8), label: 'A', color: '#484F58' },
    { y: scales.y(1e-7), label: 'B', color: '#484F58' },
    { y: scales.y(1e-6), label: 'C', color: '#484F58' },
    { y: scales.y(1e-5), label: 'M', color: '#D29922' },
    { y: scales.y(1e-4), label: 'X', color: '#F85149' },
  ];

  const firstX = scales.x(filtered[0].timestamp);
  const lastX = scales.x(filtered[filtered.length - 1].timestamp);

  const softLine = filtered.map((d, i) => `${i === 0 ? 'M' : 'L'}${scales.x(d.timestamp)},${scales.y(d.softFlux)}`).join(' ');
  const hardLine = filtered.map((d, i) => `${i === 0 ? 'M' : 'L'}${scales.x(d.timestamp)},${scales.y(d.hardFlux)}`).join(' ');

  const softArea = `${softLine} L${lastX},${ch - pad.b} L${firstX},${ch - pad.b} Z`;
  const hardArea = `${hardLine} L${lastX},${ch - pad.b} L${firstX},${ch - pad.b} Z`;

  const xticks = 6;
  const xtickVals = Array.from({ length: xticks + 1 }, (_, i) => {
    const t = scales.t0 + (i / xticks) * (scales.t1 - scales.t0);
    return { x: scales.x(t), label: new Date(t).toISOString().slice(11, 16) };
  });

  const getGoesClass = (flux) => {
    if (flux >= 1e-4) return `X${(flux * 1e4).toFixed(1)}`;
    if (flux >= 1e-5) return `M${(flux * 1e5).toFixed(1)}`;
    if (flux >= 1e-6) return `C${(flux * 1e6).toFixed(1)}`;
    if (flux >= 1e-7) return `B${(flux * 1e7).toFixed(1)}`;
    return `A${(flux * 1e8).toFixed(1)}`;
  };

  return (
    <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg h-full flex flex-col overflow-hidden shadow-lg relative group">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50 select-none">
        <div className="flex items-center gap-2">
          <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
            X-Ray Flux Stream
          </h2>
          <span className="text-[9px] text-[#484F58] font-mono">(1-Min Cadence, NOAA GOES Satellite)</span>
        </div>
        
        {/* Legends & Range Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[9px] font-mono">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-[2px] bg-[#E67E22] inline-block" />
              <span className="text-[#8B949E]">SOFT (0.1-0.8nm)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-[2px] bg-[#3498DB] inline-block" />
              <span className="text-[#8B949E]">HARD (0.05-0.4nm)</span>
            </div>
          </div>
          <div className="flex bg-[#0D1117] p-0.5 border border-[#30363D] rounded">
            {[1, 3, 6, 12].map(h => (
              <button 
                key={h} 
                className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${range === h ? 'bg-[#E67E22] text-white font-bold' : 'text-[#8B949E] hover:text-white'}`} 
                onClick={() => onRange(h)}
              >
                {h}H
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="p-3 flex-1 overflow-hidden relative">
        <svg viewBox={`0 0 ${cw} ${ch}`} className="w-full h-full">
          <defs>
            <linearGradient id="softGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E67E22" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#E67E22" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="hardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3498DB" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3498DB" stopOpacity="0.0" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#E67E22" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Reference hazard zone backdrops */}
          {(() => {
            const mY = scales.y(1e-5);
            const xY = scales.y(1e-4);
            return (
              <>
                {/* M-Class Orange Alert Zone */}
                <rect x={pad.l} y={xY} width={cw - pad.l - pad.r} height={mY - xY} fill="rgba(210,153,34,0.015)" />
                {/* X-Class Red Alert Zone */}
                <rect x={pad.l} y={0} width={cw - pad.l - pad.r} height={xY} fill="rgba(248,81,73,0.02)" />
              </>
            );
          })()}

          {/* Grid lines (horizontal) */}
          {tiers.map(t => (
            <line 
              key={`grid-${t.label}`}
              x1={pad.l} 
              y1={t.y} 
              x2={cw - pad.r} 
              y2={t.y} 
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

          {/* Threshold Label Tracks */}
          {tiers.map(t => (
            <g key={t.label}>
              <line x1={pad.l} y1={t.y} x2={cw - pad.r} y2={t.y} stroke={t.color} strokeWidth={t.label === 'M' || t.label === 'X' ? 0.7 : 0.4} opacity={t.label === 'M' || t.label === 'X' ? 0.6 : 0.2} />
              <text x={pad.l - 6} y={t.y + 3} textAnchor="end" fill={t.color} fontSize={9} fontWeight="bold" fontFamily="monospace">{t.label}</text>
            </g>
          ))}

          {/* Axes lines */}
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={ch - pad.b} stroke="#30363D" strokeWidth={1} />
          <line x1={pad.l} y1={ch - pad.b} x2={cw - pad.r} y2={ch - pad.b} stroke="#30363D" strokeWidth={1} />

          {/* X ticks labels */}
          {xtickVals.map((t, i) => (
            <text key={i} x={t.x} y={ch - pad.b + 14} textAnchor="middle" fill="#8B949E" fontSize={8} fontFamily="monospace">{t.label}</text>
          ))}

          {/* Data Lines and Fills */}
          <path d={softArea} fill="url(#softGrad)" />
          <path d={hardArea} fill="url(#hardGrad)" />
          <path d={softLine} fill="none" stroke="#E67E22" strokeWidth={1.5} filter="url(#softGlow)" />
          <path d={hardLine} fill="none" stroke="#3498DB" strokeWidth={1.0} />

          {/* Hover Crosshairs & Dots */}
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
              <circle cx={scales.x(closestPoint.timestamp)} cy={scales.y(closestPoint.softFlux)} r={3.5} fill="#E67E22" stroke="#fff" strokeWidth={1} />
              <circle cx={scales.x(closestPoint.timestamp)} cy={scales.y(closestPoint.hardFlux)} r={3.5} fill="#3498DB" stroke="#fff" strokeWidth={1} />
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
          <div className="absolute top-4 left-16 bg-[#0D1117]/90 backdrop-blur-md border border-[#30363D] px-3 py-2 rounded shadow-2xl font-mono text-[10px] space-y-1 text-[#8B949E] z-10 select-none">
            <div className="text-white border-b border-[#30363D]/60 pb-1 mb-1 font-bold text-center">
              {formatUTC(closestPoint.timestamp)}
            </div>
            <div className="flex justify-between gap-6">
              <span>SOFT FLUX:</span>
              <span className="text-[#E67E22] font-semibold">
                {closestPoint.softFlux.toExponential(1)} ({getGoesClass(closestPoint.softFlux)})
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span>HARD FLUX:</span>
              <span className="text-[#3498DB] font-semibold">
                {closestPoint.hardFlux.toExponential(1)}
              </span>
            </div>
            <div className="flex justify-between gap-6 border-t border-[#30363D]/40 pt-1">
              <span>HARDNESS:</span>
              <span className="text-green-400 font-bold">
                {closestPoint.hardnessRatio.toFixed(3)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
