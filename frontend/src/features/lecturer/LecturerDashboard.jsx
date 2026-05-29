import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { internshipService } from '../../api/internshipService.js';
import { userService } from '../../api/userService.js';
import { reportingService } from '../../api/reportingService.js';
import styles from './LecturerDashboard.module.css';

function calcW(e) {
  return Math.round((e.skills || 0) * 0.3 + (e.professionalism || 0) * 0.25 + (e.development || 0) * 0.25 + (e.deliverables || 0) * 0.2);
}

function scoreColor(value) {
  return value >= 75 ? '#065f46' : value >= 60 ? '#b45309' : '#991b1b';
}

function mapStudent(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    regNo: user.student_profile?.registration_number || '',
    programme: user.student_profile?.programme || '',
    year: user.student_profile?.academic_year || '',
    status: user.student_profile?.status || 'active',
  };
}

function filterStudentsByPlacements(studentUsers, placementRows) {
  const supervisedIds = new Set(placementRows.map(item => item.student));
  return studentUsers.map(mapStudent).filter(student => supervisedIds.has(student.id));
}

function mapActivity(activity) {
  return {
    id: activity.id,
    studentId: activity.student,
    title: activity.title,
    date: activity.activity_date,
    hrs: Number(activity.hours_spent || 0),
    status: activity.status,
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

function CohortPage({ user }) {
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [grades, setGrades] = useState({ skills: 0, professionalism: 0, development: 0, deliverables: 0 });
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  };

  const loadData = async () => {
    const [placementRows, studentUsers, activityRows, attendanceRows, evaluationRows, periodRows] = await Promise.all([
      internshipService.fetchPlacements(),
      userService.fetchStudents(),
      internshipService.fetchActivities(),
      internshipService.fetchAttendance(),
      internshipService.fetchEvaluations(),
      internshipService.fetchPeriods(),
    ]);
    const mappedStudents = filterStudentsByPlacements(studentUsers, placementRows);
    setStudents(mappedStudents);
    setActivities(activityRows.map(mapActivity));
    setAttendance(attendanceRows);
    setEvaluations(evaluationRows);
    setPeriods(periodRows);
    if (!selectedStudent && mappedStudents.length) {
      const first = mappedStudents[0];
      setSelectedStudent(first);
      const existing = evaluationRows.find(item => item.student === first.id);
      if (existing) {
        setGrades({
          skills: existing.skills,
          professionalism: existing.professionalism,
          development: existing.development,
          deliverables: existing.deliverables,
        });
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const [placementRows, studentUsers, activityRows, attendanceRows, evaluationRows, periodRows] = await Promise.all([
        internshipService.fetchPlacements(),
        userService.fetchStudents(),
        internshipService.fetchActivities(),
        internshipService.fetchAttendance(),
        internshipService.fetchEvaluations(),
        internshipService.fetchPeriods(),
      ]);
      const mappedStudents = filterStudentsByPlacements(studentUsers, placementRows);

      if (!isMounted) return;

      setStudents(mappedStudents);
      setActivities(activityRows.map(mapActivity));
      setAttendance(attendanceRows);
      setEvaluations(evaluationRows);
      setPeriods(periodRows);
      if (!selectedStudent && mappedStudents.length) {
        const first = mappedStudents[0];
        queueMicrotask(() => {
          if (!isMounted) return;
          setSelectedStudent(first);
          const existing = evaluationRows.find(item => item.student === first.id);
          if (existing) {
            setGrades({
              skills: existing.skills,
              professionalism: existing.professionalism,
              development: existing.development,
              deliverables: existing.deliverables,
            });
          }
        });
      }
    };

    void run();

    const interval = setInterval(() => {
      void run();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    const existing = evaluations.find(item => item.student === student.id);
    setGrades(existing ? {
      skills: existing.skills,
      professionalism: existing.professionalism,
      development: existing.development,
      deliverables: existing.deliverables,
    } : { skills: 0, professionalism: 0, development: 0, deliverables: 0 });
  };

  const activePeriod = useMemo(() => periods.find(period => period.status === 'active') || periods[0], [periods]);
  const validationQueue = activities.filter(activity => activity.status === 'mentor_approved');

  const saveGrade = async () => {
    if (!selectedStudent || !activePeriod) return;
    const existing = evaluations.find(item => item.student === selectedStudent.id && item.period === activePeriod.id);
    const payload = { ...grades, student: selectedStudent.id, period: activePeriod.id };
    if (existing) await internshipService.updateEvaluation(existing.id, payload);
    else await internshipService.submitEvaluation(payload);
    showToast(`Saved grade for ${selectedStudent.fullName}.`);
    await loadData();
  };

  const validateFinal = async (activity) => {
    await internshipService.approveActivity(activity.id, `Validated by ${user?.name || 'Lecturer'}`);
    showToast(`Activity "${activity.title}" validated.`);
    await loadData();
  };

  const returnForRevision = async (activity) => {
    await internshipService.returnActivity(activity.id, 'Returned for revision by lecturer');
    showToast(`Activity "${activity.title}" returned for revision.`);
    await loadData();
  };

  const attendanceRate = (studentId) => {
    const rows = attendance.filter(row => row.student === studentId);
    if (!rows.length) return null;
    return Math.round((rows.filter(row => row.status === 'present').length / rows.length) * 100);
  };

  const total = calcW(grades);

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div><div className={styles.topTitle}>Cohort Dashboard</div><div className={styles.topSub}>Lecturer view · {students.length} students</div></div>
        <div className={styles.topRight}>
          <span className={styles.pillAmber}>{validationQueue.length} awaiting validation</span>
          <span className={styles.pillPurple}>Lecturer</span>
        </div>
      </div>
      <div className={styles.content}>
        {toast && <div className={styles.toast}>{toast}</div>}
        <div className={styles.statsRow}>
          {[
            ['Students', students.length, 'In cohort', 'purple'],
            ['Fully Validated', activities.filter(item => item.status === 'validated').length, 'Both stages', 'teal'],
            ['Awaiting 2nd Stage', validationQueue.length, 'Mentor approved', 'amber'],
            ['Below 80% Att.', students.filter(student => { const rate = attendanceRate(student.id); return rate != null && rate < 80; }).length, 'Flagged', 'red'],
          ].map(([label, value, sub, cls]) => (
            <div key={label} className={`${styles.statCard} ${styles[cls]}`}>
              <div className={styles.statLbl}>{label}</div><div className={styles.statVal}>{value}</div><div className={styles.statSub}>{sub}</div>
            </div>
          ))}
        </div>
        <div className={styles.panel} style={{ marginBottom: 14 }}>
          <div className={styles.panelHdr}><span className={styles.panelTitle}>Student Cohort</span></div>
          <table className={styles.table}>
            <thead><tr><th>Student</th><th>Programme</th><th>Attendance</th><th>Activities</th><th>Score</th><th>Actions</th></tr></thead>
            <tbody>
              {students.map(student => {
                const score = evaluations.find(item => item.student === student.id);
                const activityCount = activities.filter(item => item.studentId === student.id).length;
                const rate = attendanceRate(student.id);
                return (
                  <tr key={student.id}>
                    <td><div className={styles.stuCell}><div className={styles.av} style={{ background: '#1565c0' }}>{student.fullName.split(' ').map(item => item[0]).join('').slice(0, 2)}</div><div><div className={styles.stuName}>{student.fullName}</div><div className={styles.stuId}>{student.regNo}</div></div></div></td>
                    <td className={styles.tdMuted}>{student.programme}</td>
                    <td>{rate != null ? `${rate}%` : '-'}</td>
                    <td className={styles.tdCenter}>{activityCount}</td>
                    <td>{score ? <span style={{ color: scoreColor(calcW(score)), fontWeight: 700 }}>{calcW(score)}%</span> : '-'}</td>
                    <td><button className={`${styles.ab} ${styles.abP}`} onClick={() => selectStudent(student)}>Grade</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.threeCol}>
          <div className={styles.panel}>
            <div className={styles.panelHdr}><span className={styles.panelTitle}>Grade Entry</span>{selectedStudent && <span style={{ fontSize: 11, color: '#7c3aed' }}>{selectedStudent.fullName}</span>}</div>
            <div className={styles.gf}>
              {[
                ['Skills Application', 'skills'],
                ['Professionalism', 'professionalism'],
                ['Development Stages', 'development'],
                ['Deliverables', 'deliverables'],
              ].map(([label, key]) => (
                <div key={key} className={styles.gfRow}>
                  <span className={styles.gfLbl}>{label}</span>
                  <div className={styles.gfScore}>
                    <input type="number" min="0" max="100" className={styles.gfInput} value={grades[key]} onChange={e => setGrades(current => ({ ...current, [key]: Number(e.target.value) }))} />
                  </div>
                </div>
              ))}
              <div className={styles.gfTotal}><span className={styles.gfTL}>Weighted Total</span><span className={styles.gfTV}>{total}%</span></div>
              <button className={styles.btnSave} onClick={saveGrade} disabled={!selectedStudent || !activePeriod}>Save & Notify Student</button>
            </div>
          </div>
          <div className={styles.panel}>
            <div className={styles.panelHdr}><span className={styles.panelTitle}>Validation Queue</span><span className={styles.panelLink}>{validationQueue.length} pending</span></div>
            {validationQueue.length === 0 && <div className={styles.emptyState}>No activities awaiting second-stage validation.</div>}
            {validationQueue.map(activity => (
              <div key={activity.id} className={styles.qCard}>
                <div className={styles.qt}>{activity.title}</div>
                <div className={styles.qm}>{activity.studentId} · {activity.date} · {activity.hrs}h</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                  <button className={`${styles.ab} ${styles.abP}`} style={{ flex: 1 }} onClick={() => validateFinal(activity)}>Validate</button>
                  <button className={styles.ab} style={{ flex: 1 }} onClick={() => returnForRevision(activity)}>Return</button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.panel}>
            <div className={styles.panelTitle} style={{ marginBottom: 10 }}>Generate Reports</div>
            {['placements', 'attendance', 'validation'].map(type => (
              <button key={type} className={styles.rpBtn} onClick={async () => {
                const blob = await reportingService.downloadReport(type);
                downloadBlob(blob, `ILES_lecturer_${type}_${new Date().toISOString().slice(0, 10)}.txt`);
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a2540', textTransform: 'capitalize' }}>{type} report</div>
                <span>Download</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([internshipService.fetchPlacements(), userService.fetchStudents()]).then(([placements, data]) => {
      setStudents(filterStudentsByPlacements(data, placements));
    });
  }, []);

  const filtered = students.filter(student => `${student.fullName} ${student.regNo}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><h2 className={styles.subTitle}>All Students</h2><input className={styles.searchBox} placeholder="Search by name or reg. no..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className={styles.panel}>
        <table className={styles.table}>
          <thead><tr><th>Student</th><th>Programme</th><th>Year</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(student => (
              <tr key={student.id}>
                <td>{student.fullName}<div className={styles.stuId}>{student.regNo}</div></td>
                <td className={styles.tdMuted}>{student.programme}</td>
                <td className={styles.tdMuted}>{student.year}</td>
                <td>{student.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceMonitorPage() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    Promise.all([internshipService.fetchPlacements(), userService.fetchStudents(), internshipService.fetchAttendance()]).then(([placements, studentUsers, attendanceRows]) => {
      setStudents(filterStudentsByPlacements(studentUsers, placements));
      setAttendance(attendanceRows);
    });
  }, []);

  const rateFor = (studentId) => {
    const rows = attendance.filter(row => row.student === studentId);
    if (!rows.length) return null;
    return Math.round((rows.filter(row => row.status === 'present').length / rows.length) * 100);
  };

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><h2 className={styles.subTitle}>Attendance Monitor</h2></div>
      <div className={styles.panel}>
        <table className={styles.table}>
          <thead><tr><th>Student</th><th>Attendance Rate</th><th>Clock-ins</th><th>Flag</th></tr></thead>
          <tbody>
            {students.map(student => {
              const rows = attendance.filter(row => row.student === student.id);
              const rate = rateFor(student.id);
              return (
                <tr key={student.id}>
                  <td>{student.fullName}</td>
                  <td>{rate != null ? `${rate}%` : 'No records'}</td>
                  <td>{rows.length}</td>
                  <td>{rate != null && rate < 80 ? 'Below 80%' : 'OK'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [error, setError] = useState('');

  return (
    <div className={styles.subWrap}>
      <div className={styles.subHdr}><h2 className={styles.subTitle}>Reports</h2></div>
      {error && <div className={styles.emptyState}>{error}</div>}
      <div className={styles.reportsGrid}>
        {['placements', 'attendance', 'validation'].map(type => (
          <div key={type} className={styles.reportCard} style={{ '--rc': '#7c3aed' }}>
            <div className={styles.reportTitle}>{type} report</div>
            <div className={styles.reportSub}>Backend-generated export</div>
            <button className={styles.reportBtn} style={{ background: '#7c3aed' }} onClick={async () => {
              try {
                setError('');
                const blob = await reportingService.downloadReport(type);
                downloadBlob(blob, `ILES_lecturer_${type}_${new Date().toISOString().slice(0, 10)}.txt`);
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

export default function LecturerDashboard({ page }) {
  const { user } = useAuth();
  const currentPage = page || 'overview';
  const titles = { students: 'All Students', attendance: 'Attendance Monitor', reports: 'Reports', activities: 'Reports' };

  if (currentPage === 'overview' || currentPage === 'validation' || currentPage === 'grades') return <CohortPage user={user} />;

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div><div className={styles.topTitle}>{titles[currentPage] || 'Dashboard'}</div><div className={styles.topSub}>Lecturer</div></div>
        <span className={styles.pillPurple}>Lecturer</span>
      </div>
      <div className={styles.content}>
        {currentPage === 'students' && <StudentsPage />}
        {currentPage === 'attendance' && <AttendanceMonitorPage />}
        {(currentPage === 'reports' || currentPage === 'activities') && <ReportsPage />}
      </div>
    </div>
  );
}
