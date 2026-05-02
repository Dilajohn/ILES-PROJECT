import { useNavigate } from 'react-router-dom';
import styles from './AuthModal.module.css';

export default function AuthModal({ onClose }) {
  const navigate = useNavigate();

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>

        <div className={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#e8f5e9"/>
            <path d="M20 10a5 5 0 110 10 5 5 0 010-10zM10 32c0-5.5 4.5-10 10-10s10 4.5 10 10"
              stroke="#2E7D32" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h2 className={styles.title}>Sign in to access ILES</h2>
        <p className={styles.sub}>
          You need an account to access student dashboards, submit logs, track attendance, and more.
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => go('/login')}>
            Sign In
          </button>
          <button className={styles.btnSecondary} onClick={() => go('/signup')}>
            Create Account
          </button>
        </div>

        <p className={styles.note}>
          Already have an account? <span className={styles.link} onClick={() => go('/login')}>Sign in here</span>
        </p>
      </div>
    </div>
  );
}