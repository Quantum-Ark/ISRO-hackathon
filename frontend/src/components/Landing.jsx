import { useState, useEffect, useRef, useCallback } from 'react';

// ── Custom Cursor with 3D depth ────────────────────────────────
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }
    };

    let animId;
    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px)`;
      }
      animId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    animId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}

// ── Magnetic Button ────────────────────────────────────────────
function MagneticBtn({ children, className, onClick, href, ...props }) {
  const ref = useRef(null);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.3;
    const dy = (e.clientY - cy) * 0.3;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);

  const handleLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  }, []);

  const Tag = href ? 'a' : 'button';
  const extra = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Tag
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...extra}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ── 3D Tilt Card ───────────────────────────────────────────────
function TiltCard({ children, className = '', glare = true }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * -8;
    const tiltY = (x - 0.5) * 8;
    const glareX = x * 100;
    const glareY = y * 100;
    setStyle({
      transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02,1.02,1.02)`,
      ...(glare ? {
        background: `radial-gradient(400px circle at ${glareX}% ${glareY}%, rgba(230,126,34,0.07), transparent 50%)`,
      } : {}),
    });
  }, [glare]);

  const handleLeave = useCallback(() => {
    setStyle({ transform: 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)' });
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={style}
    >
      {children}
    </div>
  );
}

// ── Typing Text ────────────────────────────────────────────────
function TypingText({ words, speed = 80, pause = 2000 }) {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const pauseTimer = useRef(null);

  useEffect(() => {
    return () => { if (pauseTimer.current) clearTimeout(pauseTimer.current); };
  }, []);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
        if (charIdx + 1 === word.length) {
          pauseTimer.current = setTimeout(() => {
            pauseTimer.current = null;
            setDeleting(true);
          }, pause);
        }
      } else {
        setText(word.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setWordIdx((w) => (w + 1) % words.length);
        }
      }
    }, deleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return (
    <span>
      {text}
      <span className="typing-cursor">|</span>
    </span>
  );
}

// ── Scroll Reveal (IntersectionObserver) ───────────────────────
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'revealed' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Animated Line (for workflow connector) ──────────────────────
function AnimatedLine() {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setProgress(1); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="workflow-line">
      <div className="workflow-line-fill" style={{ width: progress ? '100%' : '0%' }} />
    </div>
  );
}

// ── Live Demo Preview (mini dashboard mockup) ──────────────────
function DemoPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Nowcast', 'Forecast', 'Catalog'];

  useEffect(() => {
    const id = setInterval(() => setActiveTab((t) => (t + 1) % tabs.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="demo-mockup">
      {/* Fake header */}
      <div className="demo-header">
        <div className="demo-logo">
          <span className="demo-logo-dot" />
          SOLFLARE
        </div>
        <div className="demo-tabs">
          {tabs.map((t, i) => (
            <span
              key={t}
              className={`demo-tab ${i === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="demo-status">
          <span className="demo-status-dot" />
          LIVE
        </div>
      </div>

      {/* Fake content area */}
      <div className="demo-body">
        {/* Mini chart */}
        <div className="demo-chart">
          <svg viewBox="0 0 400 120" className="demo-chart-svg">
            <defs>
              <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E67E22" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#E67E22" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,100 Q50,95 80,80 T160,60 T240,40 T320,25 T400,15"
              fill="none"
              stroke="#E67E22"
              strokeWidth="2"
              className="demo-chart-line"
            />
            <path
              d="M0,100 Q50,95 80,80 T160,60 T240,40 T320,25 T400,15 L400,120 L0,120 Z"
              fill="url(#demoGrad)"
              className="demo-chart-area"
            />
            {/* Flare event marker */}
            <circle cx="320" cy="25" r="4" fill="#E74C3C" className="demo-flare-dot" />
            <text x="320" y="18" fill="#E74C3C" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">M2.4</text>
          </svg>
          <div className="demo-chart-label">
            Soft X-ray Flux (W/m²) — Last 24h
          </div>
        </div>

        {/* Mini status cards */}
        <div className="demo-cards">
          <div className="demo-card-item">
            <span className="demo-card-label">Status</span>
            <span className="demo-card-value green">Nominal</span>
          </div>
          <div className="demo-card-item">
            <span className="demo-card-label">Flux</span>
            <span className="demo-card-value">3.2e-5</span>
          </div>
          <div className="demo-card-item">
            <span className="demo-card-label">Forecast</span>
            <span className="demo-card-value orange">M-class 72%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Landing ───────────────────────────────────────────────
export default function Landing({ onEnter }) {
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const enteredRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    const t = setTimeout(() => setVisible(true), 80);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = 'hidden';
    };
  }, []);

  const handleEnter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    setEntering(true);
    setTimeout(() => onEnter(), 500);
  };

  return (
    <div className="landing-root">
      <CustomCursor />

      {/* ── NAV ── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="landing-nav-dot" />
          SOLFLARE
        </div>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#demo">Demo</a>
          <a href="#stack">Tech</a>
        </div>
        <MagneticBtn className="landing-nav-cta" onClick={handleEnter}>
          Launch Dashboard →
        </MagneticBtn>
      </nav>

      {/* ── HERO ── */}
      <section className={`landing-section landing-hero-section ${visible ? 'is-visible' : ''}`}>
        <div className="landing-hero-grid">
          <div className="landing-brand">
            <div className="landing-tag">
              <span className="landing-tag-dot" />
              ISRO · Space Science Division
            </div>

            <h1 className="landing-title">
              SOL<span className="landing-title-accent">FLARE</span>
            </h1>

            <p className="landing-role">
              <TypingText
                words={[
                  'Solar Flare Detection',
                  'Deep Learning at L1',
                  'Real-time Forecasting',
                  'Spectral Analysis',
                ]}
                speed={65}
                pause={1800}
              />
            </p>

            <p className="landing-desc">
              Deep learning analysis of Aditya-L1 satellite data.
              Early warning and classification of solar flares
              at the Sun-Earth Lagrange point — built with CNN and TCN architectures.
            </p>

            <div className="landing-ctas">
              <MagneticBtn className={`landing-btn-primary ${entering ? 'entering' : ''}`} onClick={handleEnter}>
                Enter Dashboard
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </MagneticBtn>
              <MagneticBtn className="landing-btn-ghost" href="#how-it-works">
                Learn More ↓
              </MagneticBtn>
            </div>

            {/* Quick stats */}
            <div className="landing-hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">7</span>
                <span className="hero-stat-label">Instruments</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">96.8%</span>
                <span className="hero-stat-label">Accuracy</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">{'<3h'}</span>
                <span className="hero-stat-label">Forecast</span>
              </div>
            </div>
          </div>

          {/* ── Terminal Card ── */}
          <div className="landing-visual">
            <TiltCard className="landing-terminal" glare>
              <div className="terminal-bar">
                <span className="terminal-dot t-red" />
                <span className="terminal-dot t-yellow" />
                <span className="terminal-dot t-green" />
                <span className="terminal-title">solflare.py</span>
              </div>
              <div className="terminal-body">
                <code className="terminal-line">
                  <span className="code-comment"># Aditya-L1 Solar Flare Pipeline</span>
                </code>
                <code className="terminal-line">
                  <span className="code-keyword">from</span> <span className="code-module">pipeline</span> <span className="code-keyword">import</span> Nowcast, Forecast
                </code>
                <code className="terminal-line">&nbsp;</code>
                <code className="terminal-line">
                  <span className="code-var">model</span> = Nowcast(<span className="code-str">"cnn"</span>)
                </code>
                <code className="terminal-line">
                  <span className="code-var">prediction</span> = model.<span className="code-fn">predict</span>(data)
                </code>
                <code className="terminal-line">&nbsp;</code>
                <code className="terminal-line">
                  <span className="code-str">{'>  '}</span>
                  <span className="code-output">FLARE_DETECTED</span> · M2.4 · <span className="code-val">96.8%</span>
                </code>
              </div>
              <div className="terminal-tricolor" aria-hidden="true">
                <span style={{ flex: 1, background: '#FF9933' }} />
                <span style={{ flex: 1, background: '#FFFFFF' }} />
                <span style={{ flex: 1, background: '#138808' }} />
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-section" id="features">
        <Reveal>
          <div className="section-header">
            <span className="section-tag">01</span>
            <h2 className="section-title">Capabilities</h2>
            <p className="section-desc">
              Four core modules working together to detect, classify, and forecast solar flares
              from Aditya-L1 satellite telemetry in real time.
            </p>
          </div>
        </Reveal>

        <div className="features-grid">
          {[
            {
              tag: '01',
              title: 'Nowcast Engine',
              desc: 'CNN-based real-time flare classification. Processes soft and hard X-ray channels with adaptive thresholding to detect events as they happen.',
              detail: 'Accuracy: 96.8%',
            },
            {
              tag: '02',
              title: 'TCN Forecasting',
              desc: 'Temporal convolutional network predicting 3-hour flare probability. Uses historical flux patterns to estimate future event likelihood.',
              detail: 'Window: 3 hours',
            },
            {
              tag: '03',
              title: 'L1 Data Pipeline',
              desc: 'Direct ingestion from SoLEXS and HEL1OS instruments aboard Aditya-L1. Real-time telemetry processing at the Sun-Earth Lagrange point.',
              detail: 'Distance: 1.5M km',
            },
            {
              tag: '04',
              title: 'Spectral Hardness',
              desc: 'Real-time hardness ratio monitoring for pre-flare signature detection. Tracks spectral evolution across energy bands.',
              detail: 'Bands: 2 channels',
            },
          ].map((f, i) => (
            <Reveal key={i} delay={i * 100}>
              <TiltCard className="feature-card-3d" glare>
                <div className="feature-card-inner">
                  <span className="feature-tag">{f.tag}</span>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                  <span className="feature-detail">{f.detail}</span>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="landing-section" id="how-it-works">
        <Reveal>
          <div className="section-header">
            <span className="section-tag">02</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-desc">
              From satellite telemetry to actionable forecast — a four-step pipeline.
            </p>
          </div>
        </Reveal>

        <div className="workflow">
          {[
            {
              step: '01',
              title: 'Data Ingestion',
              desc: 'SoLEXS and HEL1OS instruments transmit raw X-ray flux data from the L1 point back to ground stations.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 20l3-3" /><path d="M4 18l5-5" /><circle cx="18" cy="6" r="3" />
                  <path d="M14 10l4-4" /><path d="M11 13l3-3 3 3-3 3-3-3z" />
                </svg>
              ),
            },
            {
              step: '02',
              title: 'Feature Extraction',
              desc: 'Raw flux is processed into spectral hardness ratios, peak flux, duration, and rise-rate features for model input.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              ),
            },
            {
              step: '03',
              title: 'AI Classification',
              desc: 'CNN classifies current flare state. TCN generates 3-hour forward forecast with confidence intervals.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M9 9h6v6H9z" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
                </svg>
              ),
            },
            {
              step: '04',
              title: 'Dashboard Alert',
              desc: 'Results appear in real-time dashboard. Alerts triggered for M-class and X-class events with severity ranking.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              ),
            },
          ].map((w, i) => (
            <div key={i} className="workflow-step-wrapper">
              <Reveal delay={i * 150}>
                <div className="workflow-step">
                  <div className="workflow-step-icon">{w.icon}</div>
                  <div className="workflow-step-content">
                    <span className="workflow-step-num">Step {w.step}</span>
                    <h3 className="workflow-step-title">{w.title}</h3>
                    <p className="workflow-step-desc">{w.desc}</p>
                  </div>
                </div>
              </Reveal>
              {i < 3 && <AnimatedLine />}
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE DEMO PREVIEW ── */}
      <section className="landing-section" id="demo">
        <Reveal>
          <div className="section-header">
            <span className="section-tag">03</span>
            <h2 className="section-title">See It In Action</h2>
            <p className="section-desc">
              A live preview of the dashboard. Real-time X-ray flux monitoring
              with AI-powered flare classification and forecasting.
            </p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="demo-wrapper">
            <DemoPreview />
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div className="demo-steps">
            <div className="demo-step">
              <span className="demo-step-num">1</span>
              <span className="demo-step-text">Connect to live Aditya-L1 data stream</span>
            </div>
            <div className="demo-step-arrow">→</div>
            <div className="demo-step">
              <span className="demo-step-num">2</span>
              <span className="demo-step-text">AI classifies flux in real-time</span>
            </div>
            <div className="demo-step-arrow">→</div>
            <div className="demo-step">
              <span className="demo-step-num">3</span>
              <span className="demo-step-text">Alerts triggered for M/X-class events</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── TECH STACK ── */}
      <section className="landing-section" id="stack">
        <Reveal>
          <div className="section-header">
            <span className="section-tag">04</span>
            <h2 className="section-title">Tech Stack</h2>
            <p className="section-desc">
              Built with modern tools for performance, reliability, and real-time processing.
            </p>
          </div>
        </Reveal>

        <div className="stack-grid">
          {[
            { cat: 'Frontend', items: ['React', 'Vite', 'Tailwind CSS', 'WebSocket'] },
            { cat: 'Backend', items: ['FastAPI', 'Python', 'WebSockets', 'JSON'] },
            { cat: 'ML/AI', items: ['PyTorch', 'CNN Architecture', 'TCN Network', 'NumPy'] },
            { cat: 'Data', items: ['Aditya-L1', 'SoLEXS', 'HEL1OS', 'L1 Telemetry'] },
          ].map((col, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="stack-col">
                <h3 className="stack-cat">{col.cat}</h3>
                <ul className="stack-items">
                  {col.items.map((item, j) => (
                    <li key={j} className="stack-item">{item}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW TO USE ── */}
      <section className="landing-section" id="usage">
        <Reveal>
          <div className="section-header">
            <span className="section-tag">05</span>
            <h2 className="section-title">Getting Started</h2>
            <p className="section-desc">
              Three steps to start monitoring solar flares with Aditya-L1 data.
            </p>
          </div>
        </Reveal>

        <div className="usage-grid">
          {[
            {
              num: '01',
              title: 'Clone & Install',
              code: 'git clone https://github.com/isro/solflare.git\ncd solflare && pip install -r requirements.txt',
            },
            {
              num: '02',
              title: 'Start the Pipeline',
              code: 'python pipeline/run.py --mode realtime\n# Ingests live Aditya-L1 telemetry',
            },
            {
              num: '03',
              title: 'Launch Dashboard',
              code: 'cd frontend && npm run dev\n# Open http://localhost:5173',
            },
          ].map((u, i) => (
            <Reveal key={i} delay={i * 120}>
              <TiltCard className="usage-card" glare>
                <span className="usage-num">{u.num}</span>
                <h3 className="usage-title">{u.title}</h3>
                <pre className="usage-code"><code>{u.code}</code></pre>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="landing-section landing-cta-section">
        <Reveal>
          <div className="cta-block">
            <h2 className="cta-title">Ready to Monitor Solar Flares?</h2>
            <p className="cta-desc">
              Built for ISRO's Space Science Division. Real-time deep learning analysis
              of Aditya-L1 satellite data.
            </p>
            <div className="landing-ctas cta-buttons">
              <MagneticBtn className={`landing-btn-primary ${entering ? 'entering' : ''}`} onClick={handleEnter}>
                Launch Dashboard
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </MagneticBtn>
              <MagneticBtn className="landing-btn-ghost" href="https://www.isro.gov.in">
                ISRO →
              </MagneticBtn>
            </div>
          </div>
        </Reveal>

        <div className="landing-footer">
          <div className="footer-left">
            <span className="footer-brand">SOLFLARE</span>
            <span className="footer-copy">ISRO · Space Science Division</span>
          </div>
          <div className="footer-right">
            <span className="footer-tech">React · PyTorch · FastAPI</span>
          </div>
        </div>
      </section>

      {entering && <div className="landing-exit-overlay" />}
    </div>
  );
}
