import styles from './Button.module.css';

export default function Button({
  children, variant='primary', size='md', full=false,
  loading=false, disabled=false, type='button', onClick, style, className,
}) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    full ? styles.full : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}