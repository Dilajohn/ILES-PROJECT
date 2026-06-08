import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Button from '../components/Button/Button';
import Alert from '../components/Alert/Alert';
import styles from './AuthPage.module.css';

/* ── Password strength helper ── */
function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '', width: '0%' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '',          color: '#e2e8f0', width: '0%'   },
    { label: 'Weak',      color: '#ef4444', width: '25%'  },
    { label: 'Fair',      color: '#f59e0b', width: '50%'  },
    { label: 'Good',      color: '#3b82f6', width: '75%'  },
    { label: 'Strong',    color: '#10b981', width: '90%'  },
    { label: 'Very strong', color: '#059669', width: '100%' },
  ];
  return map[Math.min(score, 5)];
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loading } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'student',
    password: '',
    confirmPassword: '',
    registrationNumber: '',
    programme: 'BSc Computer Science',
    academicYear: 'Year 3',
  });
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [showCpw,  setShowCpw]  = useState(false);
  const [touched,  setTouched]  = useState({});

  const strength = useMemo(() => getStrength(form.password), [form.password]);

  /* ── Validate individual field or all ── */
  const validateField = (name, value, allForm) => {
    const f = allForm || form;
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== f.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const validateAll = () => {
    const fields = ['fullName', 'email', 'password', 'confirmPassword'];
    const e = {};
    fields.forEach(k => {
      const msg = validateField(k, form[k], form);
      if (msg) e[k] = msg;
    });
    if (form.role === 'student') {
      if (!form.registrationNumber.trim()) e.registrationNumber = 'Registration number is required';
      if (!form.programme.trim()) e.programme = 'Programme is required';
      if (!form.academicYear.trim()) e.academicYear = 'Academic year is required';
    }
    return e;
  };

  /* ── Field change ── */
  const set = (field) => (ev) => {
    const value = ev.target.value;
    setForm(f => {
      const next = { ...f, [field]: value };
      // Re-validate confirm password live when password changes
      if (field === 'password' && touched.confirmPassword && next.confirmPassword) {
        const msg = next.confirmPassword !== value ? 'Passwords do not match' : '';
        setErrors(e => ({ ...e, password: '', confirmPassword: msg }));
      } else if (touched[field]) {
        const msg = validateField(field, value, next);
        setErrors(e => ({ ...e, [field]: msg }));
      } else {
        setErrors(e => ({ ...e, [field]: '' }));
      }
      return next;
    });
  };

  /* ── On blur — validate touched field ── */
  const handleBlur = (field) => () => {
    setTouched(t => ({ ...t, [field]: true }));
    const msg = validateField(field, form[field], form);
    setErrors(e => ({ ...e, [field]: msg }));
  };

  /* ── Submit ── */
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    // Mark all as touched so errors show
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    const e = validateAll();
    if (Object.keys(e).length) { setErrors(e); return; }
    setApiError('');
    try {
      const data = await signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
        registration_number: form.role === 'student' ? form.registrationNumber.trim() : undefined,
        programme: form.role === 'student' ? form.programme : undefined,
        academic_year: form.role === 'student' ? form.academicYear : undefined,
      });
      navigate(`/dashboard/${data.user.role}`, { replace: true });
    } catch (err) {
      setApiError(err?.response?.data?.detail || err.message || 'Could not create account. Please try again.');
    }
  };

  const ROLES = [
    { value: 'student',  label: 'Student' },
    { value: 'mentor',   label: 'Field Mentor' },
    { value: 'lecturer', label: 'Lecturer' },
    { value: 'admin',    label: 'Administrator' },
  ];

  return (
    <>
      <h2 className={styles.heading}>Create your account</h2>

      {apiError && (
        <Alert type="danger" message={apiError} onClose={() => setApiError('')} />
      )}

      <form onSubmit={handleSubmit} noValidate>

        {/* Full Name */}
        <div className={styles.field}>
          <label className={styles.label}>Full Name</label>
          <input
            type="text"
            autoComplete="name"
            className={`${styles.input}${errors.fullName ? ' ' + styles.inputErr : ''}`}
            placeholder="e.g. Okuja Emmanuel"
            value={form.fullName}
            onChange={set('fullName')}
            onBlur={handleBlur('fullName')}
          />
          {errors.fullName && <span className={styles.err}>{errors.fullName}</span>}
        </div>

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
            onBlur={handleBlur('email')}
          />
          {errors.email && <span className={styles.err}>{errors.email}</span>}
        </div>

        {/* Role */}
        <div className={styles.field}>
          <label className={styles.label}>Role</label>
          <select
            className={styles.input}
            value={form.role}
            onChange={set('role')}
            style={{ cursor: 'pointer' }}
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {form.role === 'student' && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Registration Number</label>
              <input
                type="text"
                className={`${styles.input}${errors.registrationNumber ? ' ' + styles.inputErr : ''}`}
                placeholder="e.g. 25/U/28777/PSA"
                value={form.registrationNumber}
                onChange={set('registrationNumber')}
              />
              {errors.registrationNumber && <span className={styles.err}>{errors.registrationNumber}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Programme</label>
              <select
                className={`${styles.input}${errors.programme ? ' ' + styles.inputErr : ''}`}
                value={form.programme}
                onChange={set('programme')}
                style={{ cursor: 'pointer' }}
              >
                {['BSc Computer Science', 'BSc Software Engineering', 'BSc Information Technology'].map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.programme && <span className={styles.err}>{errors.programme}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Academic Year</label>
              <select
                className={`${styles.input}${errors.academicYear ? ' ' + styles.inputErr : ''}`}
                value={form.academicYear}
                onChange={set('academicYear')}
                style={{ cursor: 'pointer' }}
              >
                {['Year 1', 'Year 2', 'Year 3', 'Year 4'].map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.academicYear && <span className={styles.err}>{errors.academicYear}</span>}
            </div>
          </>
        )}

        {/* Password */}
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <div className={styles.passwordWrap}>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              className={`${styles.input}${errors.password ? ' ' + styles.inputErr : ''}`}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={set('password')}
              onBlur={handleBlur('password')}
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
          {/* Strength bar — only show when user has started typing */}
          {form.password && (
            <div className={styles.strengthWrap}>
              <div className={styles.strengthBar}>
                <div
                  className={styles.strengthFill}
                  style={{ width: strength.width, background: strength.color }}
                />
              </div>
              {strength.label && (
                <span className={styles.strengthText} style={{ color: strength.color }}>
                  {strength.label}
                </span>
              )}
            </div>
          )}
          {errors.password && <span className={styles.err}>{errors.password}</span>}
        </div>

        {/* Confirm Password */}
        <div className={styles.field}>
          <label className={styles.label}>Confirm Password</label>
          <div className={styles.passwordWrap}>
            <input
              type={showCpw ? 'text' : 'password'}
              autoComplete="new-password"
              className={`${styles.input}${errors.confirmPassword ? ' ' + styles.inputErr : ''}`}
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowCpw(v => !v)}
              tabIndex={-1}
              aria-label={showCpw ? 'Hide password' : 'Show password'}
            >
              {showCpw ? (
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
          {errors.confirmPassword && (
            <span className={styles.err}>{errors.confirmPassword}</span>
          )}
        </div>

        <div className={styles.submitWrap}>
          <Button type="submit" variant="primary" full loading={loading}>
            Create Account
          </Button>
        </div>
      </form>

      <p className={styles.switchText}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>Sign in</Link>
      </p>
    </>
  );
}
