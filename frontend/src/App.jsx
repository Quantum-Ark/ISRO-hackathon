import { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Replay from './components/Replay';
import Catalog from './components/Catalog';
import Metrics from './components/Metrics';
import { initWebSocketConnection } from './lib/data';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [replayEvent, setReplayEvent] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    initWebSocketConnection();
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header view={view} onView={setView} time={time} />
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        {view === 'dashboard' && <Dashboard />}
        {view === 'replay' && <Replay event={replayEvent} />}
        {view === 'catalog' && <Catalog onReplay={e => { setReplayEvent(e); setView('replay'); }} />}
        {view === 'metrics' && <Metrics />}
      </div>
    </div>
  );
}
