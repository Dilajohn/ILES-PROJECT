import styles from './Alert.module.css';

const ICONS = {
  info:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-3"/></svg>,
  warning: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L14 13H2L8 2z"/><path d="M8 6v3M8 11v.5"/></svg>,
  danger:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>,
};

export default function Alert({ type='info', message, onClose }) {
  if (!message) return null;
  return (
    <div className={`${styles.alert} ${styles[type]}`} role="alert">
      <span className={styles.icon}>{ICONS[type]}</span>
      <span className={styles.msg}>{message}</span>
      {onClose && (
        <button className={styles.closeBtn} onClick={onClose} aria-label="Dismiss">×</button>
      )}
    </div>
  );
}