import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import styles from './Sidebar.module.css';

const ICONS = {
  grid:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>,
  cal:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 2v2M11 2v2M3 8h10M3 12h6"/></svg>,
  clock:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>,
  chart:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12l3-4 3 2 3-5 3 4"/></svg>,
  doc:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zM5 6h6M5 9h4"/></svg>,
  qr:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="4" height="4"/><rect x="9" y="3" width="4" height="4"/><rect x="3" y="9" width="4" height="4"/><path d="M9 11h4M11 9v4"/></svg>,
  user:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>,
  users:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="2.5"/><circle cx="11" cy="5" r="2"/><path d="M1 13c0-2.8 2.2-5 5-5"/><path d="M10 13c0-2 1.3-3.5 3-4"/></svg>,
  brief:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="12" height="10" rx="1"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M5 9h6M8 7v4"/></svg>,
  pin:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2a4 4 0 014 4c0 4-4 8-4 8S4 10 4 6a4 4 0 014-4z"/><circle cx="8" cy="6" r="1.5"/></svg>,
  plus:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M10 5l3 3-3 3M13 8H6"/></svg>,
};

const NAV = {
  student: [
    { label:'Dashboard',        to:'/dashboard/student',            icon:'grid' },
    { label:'Activity Logbook', to:'/dashboard/student/logbook',    icon:'cal'  },
    { label:'Attendance',       to:'/dashboard/student/attendance',  icon:'clock'},
    { label:'My Scores',        to:'/dashboard/student/scores',      icon:'chart'},
    { label:'Reports',          to:'/dashboard/student/reports',     icon:'doc', badge:1 },
    { label:'My QR Code',       to:'/dashboard/student/qr',          icon:'qr'  },
    { label:'Profile',          to:'/dashboard/student/profile',     icon:'user'},
  ],
  mentor: [
    { label:'Overview',            to:'/dashboard/mentor',             icon:'grid' },
    { label:'Activity Validation', to:'/dashboard/mentor/validation',  icon:'cal', badge:5 },
    { label:'My Mentees',          to:'/dashboard/mentor/mentees',     icon:'user' },
    { label:'QR Scanner',          to:'/dashboard/mentor/qr',          icon:'qr'  },
    { label:'Create Activity',     to:'/dashboard/mentor/create',      icon:'plus'},
    { label:'Reports',             to:'/dashboard/mentor/reports',     icon:'doc' },
  ],
  lecturer: [
    { label:'Cohort Dashboard',    to:'/dashboard/lecturer',             icon:'grid'  },
    { label:'Activity Validation', to:'/dashboard/lecturer/validation',  icon:'cal',  badge:7 },
    { label:'Grade Entry',         to:'/dashboard/lecturer/grades',      icon:'chart' },
    { label:'All Students',        to:'/dashboard/lecturer/students',    icon:'user'  },
    { label:'Attendance Monitor',  to:'/dashboard/lecturer/attendance',  icon:'clock' },
    { label:'Evaluation Reports',  to:'/dashboard/lecturer/reports',     icon:'doc'   },
    { label:'Activity Reports',    to:'/dashboard/lecturer/activities',  icon:'doc'   },
  ],
  admin: [
    { label:'System Overview',    to:'/dashboard/admin',            icon:'grid'  },
    { label:'Students',           to:'/dashboard/admin/students',   icon:'user'  },
    { label:'Users & Roles',      to:'/dashboard/admin/users',      icon:'users' },
    { label:'Industry Partners',  to:'/dashboard/admin/companies',  icon:'brief' },
    { label:'Internship Periods', to:'/dashboard/admin/periods',    icon:'cal'   },
    { label:'Placements',         to:'/dashboard/admin/placements', icon:'pin'   },
    { label:'Reports',            to:'/dashboard/admin/reports',    icon:'doc'   },
    { label:'Audit Log',          to:'/dashboard/admin/audit',      icon:'chart', badge:12 },
  ],
};

const ACCENT     = { student:'#00bfa5', mentor:'#059669', lecturer:'#a78bfa', admin:'#f87171' };
const ROLE_LABEL = { student:'Student Portal', mentor:'Field Mentor', lecturer:'Lecturer', admin:'Administrator' };

export default function Sidebar({ role = 'student', user = {}, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const accent   = ACCENT[role] || '#00bfa5';
  const initials = (user.name || 'U N').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();                  // clears session in AuthContext + localStorage
    navigate('/', { replace: true }); // ← back to LANDING PAGE, not /login
  };

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoName}>ILES<span style={{ color: accent }}>.</span></div>
        <div className={styles.logoRole}>{ROLE_LABEL[role]}</div>
      </div>

      <div className={styles.navList}>
        {(NAV[role] || NAV.student).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length === 3}
            className={({ isActive }) => `${styles.navItem}${isActive ? ' ' + styles.active : ''}`}
            style={({ isActive }) => isActive ? { borderLeftColor: accent, background: `${accent}22` } : {}}
            onClick={onClose}
          >
            <span className={styles.navIcon}>{ICONS[item.icon]}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
          </NavLink>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.avatar} style={{ background: accent }}>{initials}</div>
        <div className={styles.userInfo}>
          {/* Dynamic name from real logged-in user */}
          <div className={styles.userName}>{user.name || 'User'}</div>
          <div className={styles.userSub}>{user.id || user.email || ''}</div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
          {ICONS.logout}
        </button>
      </div>
    </nav>
  );
}