import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import AuthModal from '../../components/AuthModal/AuthModal.jsx';
import styles from './LandingPage.module.css';

const ROLE_TABS = ['Student Portal','Field Mentor','Lecturer','Administrator','Reports & Logs','Evaluations'];

// Hero carousel images (in /public/images/)
const HERO_SLIDES = [
  { src:'/images/hero1.jpg', caption:'Students collaborating on internship tasks' },
  { src:'/images/hero2.jpg', caption:'Supervisor reviewing student logbook' },
  { src:'/images/hero3.jpg', caption:'Campus life and academic engagement' },
  { src:'/images/hero4.jpg', caption:'Focused study and documentation' },
];

// Testimonials with real portrait photos
const TESTIMONIALS = [
  { img:'/images/t-student.jpg', name:'Aisha Okello', role:'student', roleLabel:'Student',
    stars:5, bg:'linear-gradient(135deg,#1565c0,#0097a7)',
    quote:'Logging daily tasks used to take an hour of paperwork. Now I clock in with GPS and submit my logbook in two minutes. My grades update in real time.' },
  { img:'/images/t-mentor.jpg', name:'James Mwangi', role:'mentor', roleLabel:'Field Mentor',
    stars:5, bg:'linear-gradient(135deg,#065f46,#059669)',
    quote:'I create internship activities for all my mentees in one screen and validate submissions without chasing signatures. Huge time-saver.' },
  { img:'/images/t-lecturer.jpg', name:'Dr. Diana Nakato', role:'lecturer', roleLabel:'Lecturer',
    stars:4, bg:'linear-gradient(135deg,#4c1d95,#7c3aed)',
    quote:'Monitoring 60 students across different companies was impossible before. ILES gives me a single dashboard — validate, grade, and print reports with one click.' },
  { img:'/images/t-admin.jpg', name:'Brian Kasozi', role:'admin', roleLabel:'Administrator',
    stars:5, bg:'linear-gradient(135deg,#991b1b,#dc2626)',
    quote:'Managing master data — students, lecturers, companies, periods — is seamless. Automated grade reports make our accreditation reviews stress-free.' },
];

const FEATURES = [
  { cls:'geo',  tag:'Geolocation', icon:'📍', title:'GPS-Based Attendance',   desc:'Auto-captures latitude & longitude at clock-in. No manual input — verified and tamper-proof.' },
  { cls:'qr',   tag:'QR Code',     icon:'⬛', title:'Paperless Verification', desc:'Unique QR per student replaces manual signatures for instant activity approval.' },
  { cls:'dash', tag:'Dashboard',   icon:'📊', title:'Institutional Analytics',desc:'Real-time reports on attendance, task completion, and weighted performance scores.' },
];

const QUICK_CARDS = [
  { icon:'📋', pct:'Log',   label:'Daily Activity Logbook',  color:'#00bfa5', page:'/dashboard/student/logbook' },
  { icon:'📍', pct:'Track', label:'GPS Attendance Clock-in',  color:'#1565c0', page:'/dashboard/student/attendance' },
  { icon:'⭐', pct:'View',  label:'Supervisor Evaluations',   color:'#7c3aed', page:'/dashboard/student/scores' },
];

export default function LandingPage() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [activeTab,  setActiveTab]  = useState(0);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [slide,      setSlide]      = useState(0);
  const timerRef = useRef(null);

  // Auto-advance carousel
  useEffect(() => {
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const goSlide = idx => {
    clearInterval(timerRef.current);
    setSlide(idx);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5000);
  };

  const requireAuth = path => {
    if (user) navigate(path || `/dashboard/${user.role}`);
    else setShowModal(true);
  };

  return (
    <div className={styles.page}>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}

      {/* ── Top bar ── */}
      <header className={styles.topBar}>
        <div className={styles.logo}>ILES<span>.</span></div>
        <nav className={`${styles.topLinks}${menuOpen ? ' '+styles.topLinksOpen : ''}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#testimonials" onClick={() => setMenuOpen(false)}>Testimonials</a>
          <a href="#inspire" onClick={() => setMenuOpen(false)}>Resources</a>
          <span className={styles.currency}>UGX</span>
          {user
            ? <button className={styles.btnSignin} onClick={() => navigate(`/dashboard/${user.role}`)}>My Dashboard →</button>
            : <button className={styles.btnSignin} onClick={() => navigate('/login')}>Sign in / Register</button>
          }
        </nav>
        <button className={styles.hamburger} onClick={() => setMenuOpen(m => !m)} aria-label="Toggle menu">
          <span/><span/><span/>
        </button>
      </header>

      {/* ── Hero with image carousel background ── */}
      <section className={styles.hero}>
        {/* Carousel images */}
        <div className={styles.carouselBg}>
          {HERO_SLIDES.map((s, i) => (
            <div key={i} className={`${styles.slide}${slide === i ? ' '+styles.slideActive : ''}`}
              style={{ backgroundImage: `url(${s.src})` }} />
          ))}
          <div className={styles.carouselOverlay} />
        </div>

        {/* Hero text content */}
        <div className={styles.heroContent}>
          <div className={styles.heroTagPill}>🎓 Makerere University COCIT</div>
          <h1 className={styles.heroTitle}>Your Internship Journey,<br/>Managed Here</h1>
          <p className={styles.heroSub}>
            Internship Logging &amp; Evaluation System — bridging students,<br/>supervisors &amp; institutions with technology
          </p>
          <div className={styles.heroBadges}>
            {['📍 Geolocation Attendance','⬛ QR Code Verification','📊 Real-time Dashboards'].map(b => (
              <span key={b} className={styles.badge}>{b}</span>
            ))}
          </div>
          <div className={styles.heroCTAs}>
            <button className={styles.ctaPrimary} onClick={() => user ? navigate(`/dashboard/${user.role}`) : navigate('/signup')}>
              Get Started Free
            </button>
            <button className={styles.ctaSecondary} onClick={() => user ? navigate(`/dashboard/${user.role}`) : navigate('/login')}>
              Sign In →
            </button>
          </div>
        </div>

        {/* Carousel dots */}
        <div className={styles.carouselDots}>
          {HERO_SLIDES.map((_, i) => (
            <button key={i} className={`${styles.dot}${slide === i ? ' '+styles.dotActive : ''}`}
              onClick={() => goSlide(i)} aria-label={`Slide ${i+1}`} />
          ))}
        </div>

        {/* Search panel — flush to hero bottom, no gap */}
        <div className={styles.searchPanel}>
          <div className={styles.roleTabs}>
            {ROLE_TABS.map((tab, i) => (
              <button key={tab}
                className={`${styles.roleTab}${activeTab===i?' '+styles.roleTabActive:''}`}
                onClick={() => { setActiveTab(i); requireAuth(); }}
              >{tab}</button>
            ))}
          </div>
          <div className={styles.searchRow}>
            <div className={styles.searchField}><span className={styles.sfLabel}>Student ID / Name</span><span className={styles.sfHint}>Search by ID, name or department</span></div>
            <div className={styles.searchField}><span className={styles.sfLabel}>Internship Period</span><span className={styles.sfValue}>2025 / 2026</span></div>
            <div className={styles.searchField}><span className={styles.sfLabel}>Host Company</span><span className={styles.sfHint}>Industry partner</span></div>
            <div className={styles.searchField}><span className={styles.sfLabel}>Status</span><span className={styles.sfValue}>Active ▾</span></div>
            <button className={styles.searchBtn} onClick={() => requireAuth()}>🔍 Search</button>
          </div>
        </div>
      </section>

      {/* ── Quick Access — directly under hero (no gap) ── */}
      <section className={styles.quickSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Quick Access</h2>
            <p className={styles.sectionSub}>Register, log and evaluate internship activities in one place</p>
          </div>
          <div className={styles.sectionBadge}>4 Portals Available</div>
        </div>
        <div className={styles.promoGrid}>
          <div className={styles.promoHighlight} onClick={() => requireAuth('/signup')}>
            <div className={styles.promoHlOrb}/>
            <div className={styles.promoHlTag}>🚀 New here?</div>
            <h3>Register your internship placement now</h3>
            <p>Link your host company, lecturer and field mentor in minutes</p>
            <button className={styles.promoClaimBtn}>Sign in &amp; Get Started →</button>
          </div>
          {QUICK_CARDS.map(c => (
            <div key={c.label} className={styles.promoCard} onClick={() => requireAuth(c.page)} style={{'--ca': c.color}}>
              <div className={styles.promoCardIcon}>{c.icon}</div>
              <div><div className={styles.promoPct}>{c.pct}</div><div className={styles.promoLabel}>{c.label}</div></div>
              <button className={styles.promoClaim} style={{background:c.color}}>Open →</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Core Features ── */}
      <section className={styles.section} id="features">
        <div className={styles.sectionHeader}>
          <div><h2 className={styles.sectionTitle}>Core System Features</h2><p className={styles.sectionSub}>Built on geolocation, QR verification, and automated reporting</p></div>
        </div>
        <div className={styles.featuresRow}>
          {FEATURES.map(f => (
            <div key={f.tag} className={`${styles.featureBanner} ${styles[f.cls]}`} onClick={() => requireAuth()}>
              <div className={styles.featureBgIcon}>{f.icon}</div>
              <div className={styles.featureContent}>
                <span className={styles.featureTag}>{f.tag}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className={styles.featureArrow}>Explore →</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className={styles.statsSection}>
        <div className={styles.statsInner}>
          {[
            {num:'4',lbl:'User Roles',icon:'👥'},
            {num:'100%',lbl:'Paperless',icon:'🌿'},
            {num:'Real-time',lbl:'Validation',icon:'⚡'},
            {num:'ISO 25010',lbl:'Security',icon:'🔒'},
          ].map(s => (
            <div key={s.lbl} className={styles.statCard}>
              <span className={styles.statIcon}>{s.icon}</span>
              <div className={styles.statNum}>{s.num}</div>
              <div className={styles.statLbl}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials with real photos ── */}
      <section className={styles.section} id="testimonials">
        <div className={styles.sectionHeader}>
          <div><h2 className={styles.sectionTitle}>What Stakeholders Say</h2><p className={styles.sectionSub}>Hear from students, mentors, lecturers, and administrators using ILES</p></div>
        </div>
        <div className={styles.testimonialGrid}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} className={styles.tCard}>
              <div className={styles.tCardHeader} style={{background:t.bg}}>
                <div className={styles.tPortrait}>
                  <img src={t.img} alt={t.name} className={styles.tPortraitImg}/>
                </div>
                <div className={styles.tHeaderInfo}>
                  <div className={styles.tName}>{t.name}</div>
                  <span className={styles.tRole}>{t.roleLabel}</span>
                  <div className={styles.tStars}>{'★'.repeat(t.stars)}{'☆'.repeat(5-t.stars)}</div>
                </div>
              </div>
              <div className={styles.tBody}>
                <div className={styles.tQuoteMark}>"</div>
                <blockquote className={styles.tQuote}>{t.quote}</blockquote>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Inspire section ── */}
      <section className={styles.inspireSection} id="inspire">
        <div className={styles.inspireBg}/>
        <div className={styles.inspireInner}>
          <div className={styles.inspireLeft}>
            <div className={styles.inspireTag}>📥 Ready to start?</div>
            <h2 className={styles.inspireTitle}>Download Your Internship Report</h2>
            <p className={styles.inspireSub}>Generate a full PDF of attendance, validated activities, and weighted evaluation scores — ready for university submission.</p>
            <div className={styles.inspireActions}>
              <button className={styles.inspireBtn} onClick={() => requireAuth('/dashboard/student/reports')}>Generate Report</button>
              <button className={styles.inspireBtnGhost} onClick={() => requireAuth()}>View Dashboard</button>
            </div>
          </div>
          <div className={styles.inspireMini}>
            {[
              {icon:'📋',title:'Activity Logbook',   sub:'Record and view daily task entries',    path:'/dashboard/student/logbook'},
              {icon:'🗺️',title:'Internship Map',     sub:'See all active placement sites',         path:'/dashboard/student'},
              {icon:'⭐',title:'Evaluation Scores',  sub:'View weighted performance breakdown',    path:'/dashboard/student/scores'},
              {icon:'📄',title:'Print Reports',      sub:'Export PDF for submission',              path:'/dashboard/student/reports'},
            ].map(m => (
              <div key={m.title} className={styles.miniCard} onClick={() => requireAuth(m.path)}>
                <div className={styles.miniIcon}>{m.icon}</div>
                <div><div className={styles.miniTitle}>{m.title}</div><div className={styles.miniSub}>{m.sub}</div></div>
                <div className={styles.miniArrow}>›</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>ILES<span>.</span></div>
        <p className={styles.footerText}>© 2026 ILES — Internship Logging &amp; Evaluation System</p>
        <p className={styles.footerSub}>Powered by Geolocation · QR Verification · Secure Cloud Infrastructure · Makerere University COCIT</p>
      </footer>
    </div>
  );
}
