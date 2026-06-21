import { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Replay from './components/Replay';
import Catalog from './components/Catalog';
import Metrics from './components/Metrics';
import { initWebSocketConnection } from './lib/data';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState('dashboard');
  const [replayEvent, setReplayEvent] = useState(null);
  const [time, setTime] = useState(new Date());
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    if (!initDone) {
      initWebSocketConnection();
      setInitDone(true);
    }
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [initDone]);

  if (showLanding) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  const mainContent = (
    <div className="flex-1 overflow-auto" style={{ padding: 'clamp(8px, 1.5vw, 16px)' }}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'replay' && <Replay event={replayEvent} />}
      {view === 'catalog' && <Catalog onReplay={e => { setReplayEvent(e); setView('replay'); }} />}
      {view === 'metrics' && <Metrics />}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header view={view} onView={setView} time={time} />
      {mainContent}
    </div>
  );
}
