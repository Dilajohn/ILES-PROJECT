import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Button from '../components/Button/Button';
import Alert from '../components/Alert/Alert';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPw,   setShowPw]   = useState(false);

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    if (!form.password) {
      e.password = 'Password is required';
    }
    return e;
  };

  /* ── Submit ── */
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setApiError('');
    try {
      const data = await login({ email: form.email.trim(), password: form.password });
      const role = data?.user?.role || 'student';
      navigate(`/dashboard/${role}`, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Incorrect email or password. Please try again.');
    }
  };

  /* ── Field change helpers ── */
  const set = (field) => (ev) => {
    setForm(f => ({ ...f, [field]: ev.target.value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  return (
    <>
      <h2 className={styles.heading}>Sign in to ILES</h2>

      {apiError && (
        <Alert type="danger" message={apiError} onClose={() => setApiError('')} />
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className={styles.field}>
          <label className={styles.label}>Email Address</label>
          <input
            type="email"
            autoComplete="email"
            className={`${styles.input}${errors.email ? ' ' + styles.inputErr : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
          />
          {errors.email && <span className={styles.err}>{errors.email}</span>}
        </div>

        {/* Password */}
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <div className={styles.passwordWrap}>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              className={`${styles.input}${errors.password ? ' ' + styles.inputErr : ''}`}
              placeholder="Enter your password"
              value={form.password}
              onChange={set('password')}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPw(v => !v)}
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {errors.password && <span className={styles.err}>{errors.password}</span>}
        </div>

        {/* Forgot */}
        <div className={styles.forgot}>
          <Link to="/forgot-password" className={styles.link}>Forgot password?</Link>
        </div>

        {/* Submit */}
        <div className={styles.submitWrap}>
          <Button type="submit" variant="primary" full loading={loading}>
            Sign In
          </Button>
        </div>
      </form>

      <p className={styles.switchText}>
        Don&apos;t have an account?{' '}
        <Link to="/signup" className={styles.link}>Create one</Link>
      </p>
    </>
  );
}