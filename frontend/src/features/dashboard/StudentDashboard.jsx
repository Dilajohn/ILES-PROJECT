import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useNotifications } from '../../hooks/useNotifications.js';
import { internshipService } from '../../api/internshipService.js';
import { userService } from '../../api/userService.js';
import styles from './StudentDashboard.module.css';

function calcWeighted(e) {
  return Math.round(e.skills * 0.3 + e.professionalism * 0.25 + e.development * 0.25 + e.deliverables * 0.2);
}

function gradeLabel(total) {
  return total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F';
}

function attRate(records) {
  if (!records.length) return 0;
  return Math.round((records.filter(r => r.status === 'present').length / records.length) * 100);
}

function fmtDuration(record) {
  if (!record.clockIn || !record.clockOut) return '0h';
  const [ih, im] = record.clockIn.split(':').map(Number);
  const [oh, om] = record.clockOut.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function normalizeActivity(activity) {
  return {
    id: activity.id,
    title: activity.title,
    desc: activity.description || '',
    skills: activity.skills || '',
    hrs: Number(activity.hours_spent || 0),
    date: activity.activity_date,
    status: activity.status,
    mentorNote: activity.mentor_note || '',
    lecturerNote: activity.lecturer_note || '',
  };
}

function normalizeAttendance(record) {
  return {
    id: record.id,
    date: record.record_date,
    clockIn: record.clock_in_at,
    clockOut: record.clock_out_at,
    lat: record.latitude == null ? null : Number(record.latitude),
    lng: record.longitude == null ? null : Number(record.longitude),
    status: record.status,
  };
}

function normalizeNotification(notification) {
  return {
    id: notification.id,
    message: notification.message,
    read: notification.is_read,
    createdAt: notification.created_at,
  };
}

function NotifPanel({ userId, onClose }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId);
  const normalized = notifications.map(normalizeNotification);

  return (
    <div className={styles.notifPanel}>
      <div className={styles.notifHdr}>
        <span className={styles.notifTitle}>Notifications {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}</span>
        {unreadCount > 0 && <button className={styles.notifMarkAll} onClick={markAllRead}>Mark all read</button>}
        <button className={styles.notifClose} onClick={onClose}>x</button>
      </div>
      {normalized.length === 0 && <div className={styles.notifEmpty}>No notifications yet</div>}
      {normalized.map(notification => (
        <div
          key={notification.id}
          className={`${styles.notifItem}${notification.read ? '' : ' ' + styles.notifUnread}`}
          onClick={() => markRead(notification.id)}
        >
          <div className={styles.notifMsg}>{notification.message}</div>
          <div className={styles.notifTime}>{new Date(notification.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ))}
    </div>
  );
}

function LogbookPage({ user }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({ title: '', desc: '', skills: '', hrs: '' });

  const loadEntries = async () => {
    if (!user?.id) return;
    const data = await internshipService.fetchActivities({ student: user.id });
    setEntries(data.map(normalizeActivity));
  };

  useEffect(() => {
    loadEntries();
  }, [user?.id]);

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await internshipService.updateActivity(editId, {
          title: form.title,
          description: form.desc,
          skills: form.skills,
          hours_spent: Number(form.hrs) || 1,
        });
      } else {
        await internshipService.createActivity({
          title: form.title,
          description: form.desc,
          skills: form.skills,
          hours_spent: Number(form.hrs) || 1,
          activity_date: new Date().toISOString().slice(0, 10),
        });
      }
      setForm({ title: '', desc: '', skills: '', hrs: '' });
      setShowForm(false);
      setEditId(null);
      await loadEntries();
    } finally {
      setSaving(false);
    }
  };

  const visible = filter === 'All' ? entries : entries.filter(entry => entry.status === filter.toLowerCase().replace(' ', '_'));

  return (
    <div className={styles.subPage}>
      <div className={styles.subHeader}>
        <div><h2 className={styles.subTitle}>Activity Logbook</h2><p className={styles.subSub}>Your daily internship activity entries</p></div>
        <button className={styles.btnPrimary} onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ title: '', desc: '', skills: '', hrs: '' }); }}>
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>
      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup} style={{ gridColumn: '1/3' }}>
              <label className={styles.formLabel}>Activity Title *</label>
              <input className={styles.formInput} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1/3' }}>
              <label className={styles.formLabel}>Description</label>
              <textarea className={styles.formTextarea} rows={3} value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Skills Applied</label>
              <input className={styles.formInput} value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Hours Spent</label>
              <input className={styles.formInput} type="number" min="0.5" max="12" value={form.hrs} onChange={e => setForm(p => ({ ...p, hrs: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className={styles.btnPrimary} onClick={submit} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Entry' : 'Submit Entry'}</button>
            <button className={styles.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}
      <div className={styles.filterBar} style={{ marginBottom: 14 }}>
        {['All', 'Draft', 'Pending', 'Validated', 'Rejected'].map(value => (
          <button key={value} className={`${styles.fb}${filter === value ? ' ' + styles.fbOn : ''}`} onClick={() => setFilter(value)}>{value}</button>
        ))}
      </div>
      {visible.length === 0 && <div className={styles.emptyState}>No entries found.</div>}
      {visible.map(entry => (
        <div key={entry.id} className={styles.logEntry}>
          <div className={styles.logDate}><span className={styles.logDay}>{entry.date?.slice(8) || '--'}</span><span className={styles.logMon}>{entry.date ? new Date(entry.date).toLocaleString('en', { month: 'short' }) : '---'}</span></div>
          <div className={styles.logBody}>
            <div className={styles.logTitle}>{entry.title}</div>
            {entry.desc && <div className={styles.logDesc}>{entry.desc}</div>}
            {entry.skills && <div className={styles.logSkills}>Skills: {entry.skills}</div>}
            <div className={styles.chips}>
              <span className={`${styles.chip} ${styles[entry.status] || styles.draft}`}>{entry.status}</span>
              <span className={`${styles.chip} ${styles.hrs}`}>{entry.hrs} hrs</span>
            </div>
          </div>
          {(entry.status === 'draft' || entry.status === 'rejected') && (
            <div className={styles.logActions}>
              <button className={styles.abEdit} onClick={() => { setEditId(entry.id); setShowForm(true); setForm({ title: entry.title, desc: entry.desc, skills: entry.skills, hrs: String(entry.hrs) }); }}>Edit</button>
              <button className={styles.abDel} onClick={async () => { await internshipService.deleteActivity(entry.id); await loadEntries(); }}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AttendancePage({ user }) {
  const [records, setRecords] = useState([]);
  const [clock, setClock] = useState('');
  const [clockedIn, setClockedIn] = useState(false);
  const [todayRec, setTodayRec] = useState(null);
  const [locStatus, setLocStatus] = useState('');

  const loadAttendance = async () => {
    if (!user?.id) return;
    const data = (await internshipService.fetchAttendance({ student: user.id })).map(normalizeAttendance);
    setRecords(data);
    const today = new Date().toISOString().slice(0, 10);
    const current = data.find(record => record.date === today) || null;
    setTodayRec(current);
    setClockedIn(!!(current?.clockIn && !current?.clockOut));
  };

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock([now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, '0')).join(':'));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [user?.id]);

  const handleClockIn = () => {
    setLocStatus('Getting location...');
    if (!navigator.geolocation) {
      setLocStatus('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await internshipService.clockIn({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus(`Clocked in with GPS at ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        await loadAttendance();
      },
      async (err) => {
        await internshipService.clockIn({ latitude: null, longitude: null });
        setLocStatus(`Clocked in without GPS (${err.message})`);
        await loadAttendance();
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleClockOut = async () => {
    await internshipService.clockOut();
    setLocStatus('Clocked out successfully');
    await loadAttendance();
  };

  const rate = attRate(records);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={styles.subPage}>
      <div className={styles.subHeader}>
        <div><h2 className={styles.subTitle}>Attendance Tracker</h2><p className={styles.subSub}>GPS-verified clock-in/clock-out records</p></div>
        <div className={styles.attStats}>
          <span className={styles.attStatPill} style={{ background: rate >= 80 ? '#d1fae5' : '#fee2e2', color: rate >= 80 ? '#065f46' : '#991b1b' }}>{rate}% Rate</span>
          <span className={styles.attStatPill} style={{ background: '#e3f0fb', color: '#0c447c' }}>{records.length} Records</span>
        </div>
      </div>
      <div className={styles.clockCard}>
        <div className={styles.clockInfo}>
          <div className={styles.clockStatus}>{clockedIn ? 'Clocked In' : 'Clocked Out'}</div>
          <div className={styles.clockTime}>{clock}</div>
          <div className={styles.clockDate}>{new Date().toDateString()}</div>
          <div className={styles.clockLocStatus}>{locStatus}</div>
        </div>
        <div className={styles.clockBtns}>
          <button className={styles.btnClockIn} onClick={handleClockIn} disabled={clockedIn}>{clockedIn ? 'Clocked In' : 'Clock In (GPS)'}</button>
          <button className={styles.btnClockOut} onClick={handleClockOut} disabled={!clockedIn}>Clock Out</button>
        </div>
      </div>
      <div className={styles.panel} style={{ marginTop: 18 }}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Attendance History</span><span style={{ fontSize: 12, color: '#6b7a99' }}>{records.length} records</span></div>
        {records.length === 0 && <div className={styles.emptyState}>No attendance records yet.</div>}
        <table className={styles.attTable}>
          <thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Duration</th><th>Location</th><th>Status</th></tr></thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id}>
                <td>{record.date === today ? 'Today' : record.date}</td>
                <td>{record.clockIn || '-'}</td>
                <td>{record.clockOut || '-'}</td>
                <td>{fmtDuration(record)}</td>
                <td style={{ fontSize: 11, color: '#6b7a99' }}>{record.lat != null ? `${record.lat.toFixed(3)},${record.lng.toFixed(3)}` : '-'}</td>
                <td><span className={`${styles.chip} ${record.status === 'present' ? styles.validated : styles.rejected}`}>{record.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {todayRec && <div style={{ display: 'none' }}>{todayRec.id}</div>}
    </div>
  );
}

function ScoresPage({ user }) {
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    internshipService.fetchEvaluations({ student: user.id }).then(items => setEvaluation(items[0] || null));
  }, [user?.id]);

  if (!evaluation) {
    return <div className={styles.subPage}><div className={styles.subHeader}><div><h2 className={styles.subTitle}>My Evaluation Scores</h2><p className={styles.subSub}>Your weighted performance breakdown from your lecturer</p></div></div><div className={styles.emptyState}>No evaluation scores yet.</div></div>;
  }

  const total = calcWeighted(evaluation);
  const grade = gradeLabel(total);

  return (
    <div className={styles.subPage}>
      <div className={styles.subHeader}><div><h2 className={styles.subTitle}>My Evaluation Scores</h2><p className={styles.subSub}>Weighted performance breakdown</p></div></div>
      <div className={styles.scoreHero}>
        <div className={styles.scoreCircleWrap}>
          <svg viewBox="0 0 120 120" width="160" height="160">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#d8dde9" strokeWidth="12" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#00bfa5" strokeWidth="12" strokeDasharray={`${2 * Math.PI * 52 * total / 100} ${2 * Math.PI * 52 * (1 - total / 100)}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
          </svg>
          <div className={styles.scoreCircleCenter}>
            <div className={styles.scoreCircleNum}>{total}%</div>
            <div className={styles.scoreCircleGrade}>Grade {grade}</div>
          </div>
        </div>
        <div className={styles.scoreBars}>
          {[
            ['Skills Application', evaluation.skills, '#059669'],
            ['Professionalism', evaluation.professionalism, '#1565c0'],
            ['Development Stages', evaluation.development, '#7c3aed'],
            ['Deliverables', evaluation.deliverables, '#f59e0b'],
          ].map(([label, value, color]) => (
            <div key={label} className={styles.scoreBarRow}>
              <div className={styles.scoreBarLabel}>{label}</div>
              <div className={styles.scoreBarTrack}><div className={styles.scoreBarFill} style={{ width: `${value}%`, background: color }} /></div>
              <div className={styles.scoreBarPct} style={{ color }}>{value}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [generating, setGenerating] = useState(null);
  const [generated, setGenerated] = useState({});

  const generate = async (type) => {
    setGenerating(type);
    try {
      const reportType = type === 'activity' ? 'validation' : type;
      const blob = await internshipService.generateReport(reportType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ILES_${type}_${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      setGenerated(current => ({ ...current, [type]: true }));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className={styles.subPage}>
      <div className={styles.subHeader}><div><h2 className={styles.subTitle}>Reports</h2><p className={styles.subSub}>Generate and download internship documents from backend data</p></div></div>
      <div className={styles.reportsGrid}>
        {[
          ['activity', 'Activity Log Report', 'All submitted activities', '#00bfa5'],
          ['attendance', 'Attendance Summary', 'Clock-in records', '#1565c0'],
          ['evaluation', 'Evaluation Score Report', 'Weighted performance breakdown', '#7c3aed'],
        ].map(([id, title, sub, color]) => (
          <div key={id} className={styles.reportCard} style={{ '--rc': color }}>
            <div className={styles.reportTitle}>{title}</div>
            <div className={styles.reportSub}>{sub}</div>
            <button className={styles.reportBtn} style={{ background: color }} onClick={() => generate(id)}>
              {generating === id ? 'Generating...' : generated[id] ? 'Downloaded' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QRPage({ user }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !user?.id) return;
    QRCode.toCanvas(canvasRef.current, JSON.stringify({ id: user.id, name: user.name, role: 'student' }), {
      width: 200,
      color: { dark: '#0a1f44', light: '#f4f6fb' },
    });
  }, [user?.id, user?.name]);

  return (
    <div className={styles.subPage}>
      <div className={styles.subHeader}><div><h2 className={styles.subTitle}>My QR Code</h2><p className={styles.subSub}>Show this to your Field Mentor or Administrator for verification</p></div></div>
      <div className={styles.qrPageCard}>
        <div className={styles.qrLarge}><canvas ref={canvasRef} style={{ background: '#f4f6fb', padding: 16, borderRadius: 12 }} /></div>
        <div className={styles.qrDetails}>
          <div className={styles.qrName}>{user?.name || 'Student'}</div>
          <div className={styles.qrId}>Student · {user?.id || '-'}</div>
          <div className={styles.qrNote}>This QR code encodes your account identity for verification.</div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', university: 'Makerere University', department: 'Computer Science', regNo: '' });
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    userService.fetchCurrentUser().then(current => {
      setForm({
        fullName: current.full_name || user?.name || '',
        email: current.email || user?.email || '',
        phone: current.phone_number || '',
        university: current.student_profile?.university || 'Makerere University',
        department: current.student_profile?.department || 'Computer Science',
        regNo: current.student_profile?.registration_number || '',
      });
    });
  }, [user?.id]);

  const saveProfile = async () => {
    const current = await userService.updateCurrentUser({
      full_name: form.fullName,
      email: form.email,
      phone_number: form.phone,
      student_profile: {
        registration_number: form.regNo,
        department: form.department,
        university: form.university,
      },
    });
    setUser({ ...user, name: current.full_name, email: current.email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const changePassword = async () => {
    try {
      await userService.changePassword({
        current_password: pwForm.current,
        new_password: pwForm.newPw,
        confirm_password: pwForm.confirm,
      });
      setPwMsg('Password changed successfully');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (error) {
      setPwMsg(error?.response?.data?.current_password?.[0] || error?.response?.data?.confirm_password?.[0] || 'Could not change password');
    }
  };

  return (
    <div className={styles.subPage}>
      <div className={styles.subHeader}><div><h2 className={styles.subTitle}>My Profile</h2><p className={styles.subSub}>Your personal and internship information</p></div></div>
      <div className={styles.profileCard}>
        <div className={styles.profileForm}>
          {[
            ['Full Name', 'fullName', 'text'],
            ['Email', 'email', 'email'],
            ['Phone Number', 'phone', 'tel'],
            ['University', 'university', 'text'],
            ['Department', 'department', 'text'],
            ['Registration Number', 'regNo', 'text'],
          ].map(([label, key, type]) => (
            <div key={key} className={styles.formGroup}>
              <label className={styles.formLabel}>{label}</label>
              <input className={styles.formInput} type={type} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button className={styles.btnPrimary} onClick={saveProfile} style={{ marginTop: 16 }}>{saved ? 'Saved!' : 'Save Changes'}</button>
      </div>
      <div className={styles.profileCard} style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a2540', marginBottom: 16 }}>Change Password</h3>
        {pwMsg && <div style={{ background: '#e3f0fb', color: '#1a2540', padding: '8px 12px', borderRadius: 7, fontSize: 13, marginBottom: 12 }}>{pwMsg}</div>}
        <div className={styles.profileForm}>
          {[
            ['Current Password', 'current'],
            ['New Password', 'newPw'],
            ['Confirm New Password', 'confirm'],
          ].map(([label, key]) => (
            <div key={key} className={styles.formGroup}>
              <label className={styles.formLabel}>{label}</label>
              <input className={styles.formInput} type="password" value={pwForm[key]} onChange={e => setPwForm(current => ({ ...current, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button className={styles.btnPrimary} onClick={changePassword} style={{ marginTop: 12 }}>Update Password</button>
      </div>
    </div>
  );
}

function OverviewPage({ user, clock }) {
  const [activities, setActivities] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      internshipService.fetchActivities({ student: user.id }),
      internshipService.fetchAttendance({ student: user.id }),
      internshipService.fetchEvaluations({ student: user.id }),
    ]).then(([activitiesData, attendanceData, evaluations]) => {
      setActivities(activitiesData.map(normalizeActivity).slice(0, 3));
      setAttendance(attendanceData.map(normalizeAttendance));
      setEvaluation(evaluations[0] || null);
    });
  }, [user?.id]);

  const rate = attRate(attendance);
  const total = evaluation ? calcWeighted(evaluation) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.find(record => record.date === today);
  const grade = gradeLabel(total);
  const firstName = (user?.name || 'Student').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className={styles.statsRow}>
        {[
          ['Attendance Rate', `${rate}%`, rate >= 80 ? 'Above 80% minimum' : 'Below 80% threshold', styles.teal],
          ['Log Entries Submitted', `${activities.length} entries`, 'This internship period', styles.sky],
          ['Pending Validation', `${activities.filter(a => a.status === 'pending').length} tasks`, 'Awaiting mentor review', styles.amber],
          ['Overall Score', evaluation ? `${total}% (${grade})` : '-', evaluation ? 'Weighted evaluation' : 'Not yet graded', styles.purple],
        ].map(([label, value, sub, cls]) => (
          <div key={label} className={`${styles.statCard} ${cls}`}>
            <div className={styles.statLbl}>{label}</div>
            <div className={styles.statVal}>{value}</div>
            <div className={styles.statSub}>{sub}</div>
          </div>
        ))}
      </div>
      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <div className={styles.panelHdr}><span className={styles.panelTitle}>Recent Activity Log</span></div>
          {activities.length === 0 && <div className={styles.emptyState}>No activities yet.</div>}
          {activities.map(activity => (
            <div key={activity.id} className={styles.logEntry}>
              <div className={styles.logDate}><span className={styles.logDay}>{activity.date?.slice(8) || '--'}</span><span className={styles.logMon}>{activity.date ? new Date(activity.date).toLocaleString('en', { month: 'short' }) : '---'}</span></div>
              <div className={styles.logBody}>
                <div className={styles.logTitle}>{activity.title}</div>
                <div className={styles.logDesc}>{activity.desc?.slice(0, 80) || ''}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.rightCol}>
          <div className={styles.clockCard}>
            <div className={styles.clockStatus}>{todayAtt?.clockIn && !todayAtt?.clockOut ? 'Clocked In' : 'Clocked Out'}</div>
            <div className={styles.clockTime}>{clock}</div>
            <div className={styles.clockDate}>{greeting}, {firstName}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StudentDashboard({ page }) {
  const { user } = useAuth();
  const location = useLocation();
  const [clock, setClock] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const { notifications, unreadCount } = useNotifications(user?.id);
  const currentPage = page || location.pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock([now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, '0')).join(':'));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const pageTitle = useMemo(() => ({
    dashboard: 'Student Dashboard',
    logbook: 'Activity Logbook',
    attendance: 'Attendance',
    scores: 'My Scores',
    reports: 'Reports',
    qr: 'My QR Code',
    profile: 'Profile',
  }), []);

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div><div className={styles.topTitle}>{pageTitle[currentPage] || 'Student Dashboard'}</div><div className={styles.topSub}>{new Date().toDateString()} · Internship 2025/26</div></div>
        <div className={styles.topRight}>
          <div style={{ position: 'relative' }}>
            <button className={styles.notifBtn} onClick={() => setShowNotif(v => !v)} aria-label="Notifications">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a2540" strokeWidth="1.5"><path d="M8 2a4 4 0 014 4c0 3 1 4 1 4H3s1-1 1-4a4 4 0 014-4zM6.5 12.5a1.5 1.5 0 003 0" /></svg>
              {unreadCount > 0 && <span className={styles.notifDot}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotif && <NotifPanel userId={user?.id} onClose={() => setShowNotif(false)} />}
          </div>
          <span className={styles.periodPill}>Internship 2025/26</span>
        </div>
      </div>
      <div className={styles.content}>
        {(currentPage === 'dashboard' || currentPage === 'student') && <OverviewPage user={user} clock={clock} notifications={notifications} />}
        {currentPage === 'logbook' && <LogbookPage user={user} />}
        {currentPage === 'attendance' && <AttendancePage user={user} />}
        {currentPage === 'scores' && <ScoresPage user={user} />}
        {currentPage === 'reports' && <ReportsPage user={user} />}
        {currentPage === 'qr' && <QRPage user={user} />}
        {currentPage === 'profile' && <ProfilePage user={user} />}
      </div>
    </div>
  );
}
