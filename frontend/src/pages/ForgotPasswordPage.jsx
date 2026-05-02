import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button/Button';
import Alert from '../components/Alert/Alert';
import styles from './AuthPage.module.css';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: '#0a1f44', marginBottom: 8 }}>
          Check your email
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
          If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
        </p>
        <Link to="/login" className={styles.link}>Back to Sign in</Link>
      </div>
    );
  }

  return (
    <>
      <h2 className={styles.heading}>Reset your password</h2>
      <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: -16, marginBottom: 24, lineHeight: 1.6 }}>
        Enter your email address and we will send you a link to reset your password.
      </p>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label}>Email Address</label>
          <input
            type="email"
            autoComplete="email"
            className={`${styles.input}${error ? ' ' + styles.inputErr : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
          />
        </div>

        <div className={styles.submitWrap}>
          <Button type="submit" variant="primary" full loading={loading}>
            Send Reset Link
          </Button>
        </div>
      </form>

      <p className={styles.switchText}>
        Remember your password?{' '}
        <Link to="/login" className={styles.link}>Sign in</Link>
      </p>
    </>
  );
}