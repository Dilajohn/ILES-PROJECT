import { Outlet, Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <Link to="/" className={styles.logo}>
            ILES<span>.</span>
          </Link>
          <p className={styles.tagline}>Internship Logging &amp; Evaluation System</p>
          <Outlet />
        </div>
        <p className={styles.footer}>© 2026 ILES — Makerere University COCIT</p>
      </div>
    </div>
  );
}