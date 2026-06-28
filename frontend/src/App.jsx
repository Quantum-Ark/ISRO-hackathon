import { useState, useEffect, useRef } from 'react';
import Landing from './components/Landing';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ImpactPanel from './components/ImpactPanel';
import Replay from './components/Replay';
import Catalog from './components/Catalog';
import Metrics from './components/Metrics';
import { initWebSocketConnection } from './lib/data';



export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [replayEvent, setReplayEvent] = useState(null);
  const [time, setTime] = useState(new Date());
  const [initDone, setInitDone] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!initDone) {
      initWebSocketConnection();
      setInitDone(true);
    }
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [initDone]);

  const handleView = (v) => {
    if (v === activeTab) return;
    setActiveTab(v);
    setTransitioning(true);
    setTimeout(() => {
      setView(v);
      setTimeout(() => setTransitioning(false), 50);
    }, 180);
  };

  if (showLanding) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  const mainContent = (
    <div className="flex-1 overflow-auto" style={{ padding: 'clamp(12px, 2vw, 24px)' }}>
      {view === 'dashboard' && <Dashboard onNavigate={handleView} />}
      {view === 'impact' && <ImpactPanel />}
      {view === 'replay' && <Replay event={replayEvent} />}
      {view === 'catalog' && <Catalog onReplay={e => { setReplayEvent(e); handleView('replay'); }} />}
      {view === 'metrics' && <Metrics />}
    </div>
  );

  return (
    <>




      {/* Main app shell */}
      <div className="app-shell">
        <Header view={activeTab} onView={handleView} time={time} onLogoClick={() => setShowLanding(true)} />
        <div className={`flex-1 overflow-auto ${transitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'} transition-all duration-200 ease-out`}>
          {mainContent}
        </div>
      </div>
    </>
  );
}
