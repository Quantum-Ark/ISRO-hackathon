import { useState, useEffect } from 'react';
import { formatUTC, fmtFlux } from '../lib/data';

export default function Replay({ event }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [speed, setSpeed] = useState(10);
  const [source, setSource] = useState('PRADAN');
  const [simulating, setSimulating] = useState(false);

  const [replayPoints, setReplayPoints] = useState([]);
  const [activePoint, setActivePoint] = useState(null);

  useEffect(() => {
    const eid = event ? event.id : 6;
    setSimulating(true);
    fetch(`http://${window.location.hostname}:8000/api/replay/${eid}`)
      .then(r => r.json())
      .then(data => {
        setReplayPoints(data.points);
        setProgress(0);
        if (data.points.length > 0) {
          setActivePoint(data.points[0]);
        }
        setSimulating(false);
      })
      .catch(err => {
        console.error("Replay API offline", err);
        setSimulating(false);
      });
  }, [event]);

  useEffect(() => {
    if (!playing || replayPoints.length === 0) return;
    const timer = setInterval(() => {
      setProgress(p => {
        const nextIdx = p + 1;
        if (nextIdx >= replayPoints.length) {
          setPlaying(false);
          return p;
        }
        setActivePoint(replayPoints[nextIdx]);
        return nextIdx;
      });
    }, 1000 / speed);
    return () => clearInterval(timer);
  }, [playing, speed, replayPoints]);

  const handleSeek = (e) => {
    if (replayPoints.length === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    const idx = Math.min(replayPoints.length - 1, Math.max(0, Math.floor(frac * replayPoints.length)));
    setProgress(idx);
    setActivePoint(replayPoints[idx]);
  };

  const soft = activePoint ? activePoint.softFlux : 5e-8;
  const hard = activePoint ? activePoint.hardFlux : 3e-9;
  const hr = activePoint ? activePoint.hardnessRatio : 0.035;
  const pct = replayPoints.length > 1 ? (progress / (replayPoints.length - 1)) * 100 : 0;

  return (
    <div className="space-y-4 max-w-5xl mx-auto py-3 select-none">
      <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
        <h1 className="text-lg font-bold font-mono tracking-wider text-[#E6EDF3] uppercase">
          Hardware Replay Simulator
        </h1>
        {event && (
          <div className="text-xs text-[#8B949E] font-mono">
            TARGET STORM: <span className="text-[#F1C40F] font-bold">{event.cls}</span>
            <span className="ml-4 text-[11px] text-[#566176]">{formatUTC(event.ts)}</span>
          </div>
        )}
      </div>

      {/* Controls Card */}
      <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex gap-2">
            <button 
              className={`px-4 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                playing 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-[#E67E22] hover:bg-[#B85E15] text-white shadow-md shadow-[#E67E22]/10'
              }`}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? 'PAUSE' : 'PLAY'}
            </button>
            <button 
              className="px-4 py-1.5 rounded text-xs uppercase tracking-wider font-bold bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] cursor-pointer"
              onClick={() => { 
                setProgress(0); 
                setPlaying(false); 
                if(replayPoints.length > 0) setActivePoint(replayPoints[0]); 
              }}
            >
              RESET
            </button>
          </div>
          
          <div className="h-6 w-[1px] bg-[#30363D]" />
          
          {/* Speed Multiplier */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8B949E] font-mono uppercase">ACCELERATION:</span>
            <div className="flex bg-[#0D1117] p-0.5 border border-[#30363D] rounded">
              {[1, 5, 10, 50, 100].map(s => (
                <button 
                  key={s} 
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded cursor-pointer transition-all ${speed === s ? 'bg-[#E67E22] text-white font-bold' : 'text-[#8B949E] hover:text-white'}`} 
                  onClick={() => setSpeed(s)}
                >
                  {s}X
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#30363D]" />

          {/* Telemetry Source */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8B949E] font-mono uppercase">STREAM SOURCE:</span>
            <div className="flex bg-[#0D1117] p-0.5 border border-[#30363D] rounded">
              {['PRADAN', 'GOES', 'SIMULATED'].map(s => (
                <button 
                  key={s} 
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded cursor-pointer transition-all ${source === s ? 'bg-[#E67E22] text-white font-bold' : 'text-[#8B949E] hover:text-white'}`} 
                  onClick={() => setSource(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seek Track Bar */}
      <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg p-4 shadow-xl">
        <div className="relative cursor-pointer" onClick={handleSeek}>
          <div className="h-2 bg-[#0D1117] border border-[#30363D] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-100" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <span className="text-[10px] text-[#8B949E] font-mono">
              TIME TAG: <span className="text-[#E6EDF3]">{activePoint ? new Date(activePoint.timestamp).toISOString().slice(11, 19) : '00:00:00'} UTC</span>
            </span>
            <span className="text-xs text-[#E67E22] font-mono font-bold">
              PROGRESS: {pct.toFixed(0)}%
            </span>
            <span className="text-[10px] text-[#8B949E] font-mono">
              DURATION: {replayPoints.length > 0 ? `+${Math.floor((replayPoints.length * 10) / 60)} min` : '+60 min'}
            </span>
          </div>
        </div>
      </div>

      {/* Realtime Readings */}
      <div className="bg-[#161B22]/70 backdrop-blur-md border border-[#30363D] rounded-lg p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
          <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8B949E]">
            Replayed Physical Telemetry
          </h2>
          {simulating && (
            <span className="text-[9px] font-mono text-[#D29922] uppercase animate-pulse">
              SYNCING REPLAY STREAM...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0D1117]/60 border border-[#30363D] rounded p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1">SoLEXS (Soft X-Ray)</div>
            <div className="text-xl font-bold font-mono text-[#E67E22]">{fmtFlux(soft)}</div>
            <div className="text-[8px] text-[#566176] font-mono mt-1">W/m²</div>
          </div>
          <div className="bg-[#0D1117]/60 border border-[#30363D] rounded p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1">HEL1OS (Hard X-Ray)</div>
            <div className="text-xl font-bold font-mono text-[#3498DB]">{fmtFlux(hard)}</div>
            <div className="text-[8px] text-[#566176] font-mono mt-1">W/m² equivalent</div>
          </div>
          <div className="bg-[#0D1117]/60 border border-[#30363D] rounded p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider font-semibold font-mono text-[#8B949E] mb-1">Hardness Ratio</div>
            <div className={`text-xl font-bold font-mono ${hr > 0.06 ? 'text-orange-400' : 'text-[#8B949E]'}`}>
              {hr.toFixed(4)}
            </div>
            <div className="text-[8px] text-[#566176] font-mono mt-1">HEL1OS / SoLEXS</div>
          </div>
        </div>

        {/* Model State Simulator readout */}
        {activePoint && activePoint.status && (
          <div className="bg-[#0D1117]/80 border border-[#30363D]/80 rounded p-3 font-mono text-[10px] space-y-2">
            <div className="text-[9px] uppercase font-bold text-orange-400 border-b border-[#30363D]/40 pb-1">
              Pipeline Neural Inferences:
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[#8B949E]">
              <div>NOWCAST STATE: <span className="text-red-500 font-bold block">{activePoint.status.systemStatus.stateLabel} ({activePoint.status.nowcast.class})</span></div>
              <div>FORECAST PROBABILITY: <span className="text-[#3498DB] font-bold block">{activePoint.status.forecast.probability}%</span></div>
              <div>ONSET DETECTED: <span className="text-[#E6EDF3] block">{activePoint.status.nowcast.currentPhase}</span></div>
              <div>Z-SCORE VALUE: <span className="text-[#E6EDF3] block">{activePoint.status.nowcast.zScore.toFixed(2)}σ</span></div>
            </div>
            {activePoint.status.hardnessRatio.preFlareSignal && (
              <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded text-[9px] font-bold animate-pulse text-center">
                ⚠️ SPECTRAL HARDENING DETECTED: PRE-FLARE WARNING FIRED (+{activePoint.status.hardnessRatio.minutesEarly} MINUTES ADVANCE WARNING)
              </div>
            )}
          </div>
        )}

        {/* Cataloged Event Details */}
        {event && (
          <div className="border-t border-[#30363D]/40 pt-3 text-[9px] font-mono text-[#566176] flex flex-wrap gap-x-6 gap-y-1">
            <div>EVENT ID: <span className="text-[#8B949E]">{event.id}</span></div>
            <div>PEAK FLUX: <span className="text-[#8B949E]">{event.peak.toExponential(1)} W/m²</span></div>
            <div>GOES LEAD TIME: <span className="text-orange-400 font-bold">+{event.lead} MIN</span></div>
            <div>INSTRUMENT COMBINATION: <span className="text-[#8B949E]">{event.instrument || event.instr}</span></div>
            <div>STORM DURATION: <span className="text-[#8B949E]">{event.duration || event.dur}</span></div>
            <div>DETECTION CONFIDENCE: <span className="text-green-400 font-bold">{event.conf}%</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
