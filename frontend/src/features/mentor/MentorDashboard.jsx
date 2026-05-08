import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { internshipService } from '../../api/internshipService.js';
import { userService } from '../../api/userService.js';
import { reportingService } from '../../api/reportingService.js';
import styles from './MentorDashboard.module.css';

function mapStudent(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    regNo: user.student_profile?.registration_number || '',
    programme: user.student_profile?.programme || '',
    status: user.student_profile?.status || 'active',
  };
}

function mapActivity(activity) {
  return {
    id: activity.id,
    studentId: activity.student,
    title: activity.title,
    date: activity.activity_date,
    hrs: Number(activity.hours_spent || 0),
    status: activity.status,
    desc: activity.description || '',
    skills: activity.skills || '',
    mentorNote: activity.mentor_note || '',
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function OverviewPage() {
  const [activities, setActivities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  };

  const loadActivities = async () => {
    const data = await internshipService.fetchActivities();
    const mapped = data.map(mapActivity);
    setActivities(mapped);
    if (!selected && mapped.length) setSelected(mapped[0]);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const data = await internshipService.fetchActivities();
      const mapped = data.map(mapActivity);
      if (!isMounted) return;
      setActivities(mapped);
      if (!selected && mapped.length) {
        queueMicrotask(() => {
          if (isMounted) setSelected(mapped[0]);
        });
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  const approve = async () => {
    if (!selected) return;
    await internshipService.validateActivity(selected.id, note);
    showToast('Activity approved and forwarded to lecturer.');
    setNote('');
    setSelected(null);
    await loadActivities();
  };

  const reject = async () => {
    if (!selected || !note.trim()) {
      showToast('Please add a feedback note before returning an activity.');
      return;
    }
    await internshipService.rejectActivity(selected.id, note);
    showToast('Activity returned to student.');
    setNote('');
    setSelected(null);
    await loadActivities();
  };

  const visible = activities;

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div><div className={styles.topTitle}>Activity Validation Queue</div><div className={styles.topSub}>Field mentor review</div></div>
        <div className={styles.topRight}>
          <span className={styles.pillAmber}>{activities.filter(item => item.status === 'pending').length} Pending</span>
          <span className={styles.pillGreen}>Mentor</span>
        </div>
      </div>
      <div className={styles.content}>
        {toast && <div className={styles.toast}>{toast}</div>}
        <div className={styles.statsRow}>
          {[
            ['All Activities', activities.length, 'This period', 'sky'],
            ['Pending Review', activities.filter(item => item.status === 'pending').length, 'Awaiting first-stage', 'amber'],
            ['Approved', activities.filter(item => item.status === 'mentor_approved').length, 'Forwarded', 'green'],
            ['Returned', activities.filter(item => item.status === 'rejected').length, 'Needs revision', 'red'],
          ].map(([label, value, sub, cls]) => (
            <div key={label} className={`${styles.statCard} ${styles[cls]}`}>
              <div className={styles.statLbl}>{label}</div><div className={styles.statVal}>{value}</div><div className={styles.statSub}>{sub}</div>
            </div>
          ))}
        </div>
        <div className={styles.twoCol}>
          <div className={styles.panel}>
            <div className={styles.panelHdr}><span className={styles.panelTitle}>Submitted Activities</span></div>
            {visible.map(activity => (
              <div key={activity.id} className={`${styles.actCard}${selected?.id === activity.id ? ' ' + styles.actSel : ''}`} onClick={() => { setSelected(activity); setNote(activity.mentorNote || ''); }}>
                <div className={styles.actTop}>
                  <div>
                    <div className={styles.actStuName}>{activity.studentId} · {activity.date}</div>
                    <div className={styles.actTitle}>{activity.title}</div>
                  </div>
                  <span className={`${styles.chip} ${styles[activity.status] || styles.pending}`}>{activity.status}</span>
                </div>
                <div className={styles.actDesc}>{activity.desc}</div>
              </div>
            ))}
          </div>
          <div className={styles.rightCol}>
            {selected && (
              <div className={styles.detailPanel}>
                <div className={styles.dpHdr}><div className={styles.dpName}>{selected.title}</div><div className={styles.dpMeta}>{selected.studentId} · {selected.date}</div></div>
                <div className={styles.dpRow}><span className={styles.dpK}>Hours</span><span className={styles.dpV}>{selected.hrs} hrs</span></div>
                <div className={styles.dpRow}><span className={styles.dpK}>Skills</span><span className={styles.dpV}>{selected.skills || '-'}</span></div>
                <div className={styles.dpLbl}>Mentor feedback note</div>
                <textarea className={styles.dpNote} value={note} onChange={e => setNote(e.target.value)} />
                {selected.status === 'pending' && (
                  <>
                    <button className={styles.btnApprove} onClick={approve}>Approve & Forward</button>
                    <button className={styles.btnReject} onClick={reject}>Return to Student</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenteesPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    userService.fetchStudents().then(items => setStudents(items.map(mapStudent)));
  }, []);

  const filtered = students.filter(student => `${student.fullName} ${student.regNo}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><div><h2 className={styles.subTitle}>My Mentees</h2></div><input className={styles.searchBox} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." /></div>
      <div className={styles.menteesGrid}>
        {filtered.map(student => (
          <div key={student.id} className={styles.menteeCard}>
            <div className={styles.menteeTop}><div className={styles.av} style={{ background: '#1565c0', width: 42, height: 42 }}>{student.fullName.split(' ').map(item => item[0]).join('').slice(0, 2)}</div><div><div className={styles.menteeName}>{student.fullName}</div><div className={styles.menteeCompany}>{student.regNo}</div></div></div>
            <span className={`${styles.chip} ${student.status === 'active' ? styles.approved : styles.rejected}`}>{student.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatePage({ user }) {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ studentId: '', title: '', desc: '', skills: '', hrs: '', date: new Date().toISOString().slice(0, 10) });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    userService.fetchStudents().then(items => setStudents(items.map(mapStudent)));
  }, []);

  const submit = async () => {
    if (!form.studentId || !form.title.trim()) {
      setError('Please select a student and enter a title.');
      return;
    }
    try {
      await internshipService.createActivity({
        student: form.studentId,
        mentor: user?.id,
        title: form.title,
        description: form.desc,
        skills: form.skills,
        hours_spent: Number(form.hrs) || 1,
        activity_date: form.date,
      });
      setSaved(true);
      setError('');
      setForm(current => ({ ...current, studentId: '', title: '', desc: '', skills: '', hrs: '', date: current.date }));
      setTimeout(() => setSaved(false), 2500);
    } catch (nextError) {
      setSaved(false);
      setError(nextError?.response?.data?.detail || nextError?.message || 'Could not create activity.');
    }
  };

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><div><h2 className={styles.subTitle}>Create Activity</h2></div></div>
      {saved && <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>Activity created successfully.</div>}
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div className={styles.formCard}>
        <div className={styles.formGroup} style={{ gridColumn: '1/3' }}>
          <label className={styles.formLabel}>Assign to Mentee *</label>
          <select className={styles.formInput} value={form.studentId} onChange={e => setForm(current => ({ ...current, studentId: e.target.value }))}>
            <option value="">Select a student...</option>
            {students.map(student => <option key={student.id} value={student.id}>{student.fullName} — {student.regNo}</option>)}
          </select>
        </div>
        <div className={styles.formGroup} style={{ gridColumn: '1/3' }}>
          <label className={styles.formLabel}>Activity Title *</label>
          <input className={styles.formInput} value={form.title} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} />
        </div>
        <div className={styles.formGroup} style={{ gridColumn: '1/3' }}>
          <label className={styles.formLabel}>Description</label>
          <textarea className={styles.formTextarea} rows={3} value={form.desc} onChange={e => setForm(current => ({ ...current, desc: e.target.value }))} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Skills</label>
          <input className={styles.formInput} value={form.skills} onChange={e => setForm(current => ({ ...current, skills: e.target.value }))} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Expected Hours</label>
          <input className={styles.formInput} type="number" value={form.hrs} onChange={e => setForm(current => ({ ...current, hrs: e.target.value }))} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Date</label>
          <input className={styles.formInput} type="date" value={form.date} onChange={e => setForm(current => ({ ...current, date: e.target.value }))} />
        </div>
        <button className={styles.btnPrimary} onClick={submit} style={{ gridColumn: '1/3' }}>Create Activity</button>
      </div>
    </div>
  );
}

function QRScannerPage() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);

  useEffect(() => {
    userService.fetchStudents().then(items => setStudents(items.map(mapStudent)));
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(nextStream);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        videoRef.current.play();
      }
    } catch (e) {
      setError(`Camera access denied: ${e.message}`);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const simulateScan = () => {
    if (!students.length) return;
    const student = students[0];
    setResult({ name: student.fullName, regNo: student.regNo, time: new Date().toTimeString().slice(0, 5) });
  };

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><div><h2 className={styles.subTitle}>QR Scanner</h2></div></div>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div className={styles.qrPageCard}>
        <div className={styles.qrLarge}>
          {stream ? <video ref={videoRef} style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 12, background: '#0a1f44' }} muted playsInline /> : <div className={styles.qrFrame} onClick={startCamera}>Tap to activate camera scanner</div>}
        </div>
        <div className={styles.qrDetails}>
          {!stream && <button className={styles.btnPrimary} onClick={startCamera} style={{ marginTop: 16, width: '100%' }}>Open Camera Scanner</button>}
          {stream && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className={styles.btnPrimary} onClick={simulateScan}>Simulate Scan</button><button className={styles.btnPrimary} onClick={stopCamera}>Stop Camera</button></div>}
          {result && <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 9, padding: 14, marginTop: 12 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#065f46', marginBottom: 6 }}>Student Verified</div><div>{result.name}</div><div style={{ fontSize: 12, color: '#6b7a99' }}>{result.regNo}</div><div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>Scanned at {result.time}</div></div>}
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [error, setError] = useState('');

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><div><h2 className={styles.subTitle}>Reports</h2></div></div>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div className={styles.reportsGrid}>
        {['validation', 'attendance', 'placements'].map(type => (
          <div key={type} className={styles.reportCard} style={{ '--rc': '#1565c0' }}>
            <div className={styles.reportTitle}>{type} report</div>
            <div className={styles.reportSub}>Backend-generated export</div>
            <button className={styles.reportBtn} style={{ background: '#1565c0' }} onClick={async () => {
              try {
                setError('');
                const blob = await reportingService.downloadReport(type);
                downloadBlob(blob, `ILES_mentor_${type}_${new Date().toISOString().slice(0, 10)}.txt`);
              } catch (nextError) {
                setError(nextError?.response?.data?.detail || nextError?.message || `Could not download the ${type} report.`);
              }
            }}>Download</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MentorDashboard({ page }) {
  const { user } = useAuth();
  const currentPage = page || 'overview';
  const titles = { mentees: 'My Mentees', qr: 'QR Scanner', create: 'Create Activity', reports: 'Reports' };

  if (currentPage === 'overview' || currentPage === 'validation') return <OverviewPage />;

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div><div className={styles.topTitle}>{titles[currentPage] || 'Dashboard'}</div><div className={styles.topSub}>Field Mentor</div></div>
        <span className={styles.pillGreen}>Mentor</span>
      </div>
      <div className={styles.content}>
        {currentPage === 'mentees' && <MenteesPage />}
        {currentPage === 'qr' && <QRScannerPage />}
        {currentPage === 'create' && <CreatePage user={user} />}
        {currentPage === 'reports' && <ReportsPage />}
      </div>
    </div>
  );
}
