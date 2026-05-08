import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { internshipService } from '../../api/internshipService.js';
import { userService } from '../../api/userService.js';
import { reportingService } from '../../api/reportingService.js';
import styles from './AdminDashboard.module.css';

const TABS = ['overview', 'students', 'users', 'companies', 'periods', 'placements', 'reports', 'audit'];
const TAB_LABELS = {
  overview: 'System Overview',
  students: 'Students',
  users: 'Users & Roles',
  companies: 'Industry Partners',
  periods: 'Internship Periods',
  placements: 'Placements',
  reports: 'Reports',
  audit: 'Audit Log',
};

function chipStatus(status) {
  const palette = {
    active: ['#d1fae5', '#065f46'],
    inactive: ['#f1f5f9', '#475569'],
    flagged: ['#fee2e2', '#991b1b'],
    closed: ['#f1f5f9', '#475569'],
  };
  const [background, color] = palette[status] || palette.inactive;
  return <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9, fontWeight: 500, background, color }}>{status}</span>;
}

function roleChip(role) {
  const palette = {
    admin: ['#fee2e2', '#991b1b'],
    lecturer: ['#ede9fe', '#4c1d95'],
    mentor: ['#d1fae5', '#065f46'],
    student: ['#e3f0fb', '#0c447c'],
  };
  const [background, color] = palette[role] || ['#f1f5f9', '#475569'];
  return <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9, fontWeight: 500, background, color }}>{role}</span>;
}

function mapStudent(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    regNo: user.student_profile?.registration_number || '',
    year: user.student_profile?.academic_year || '',
    programme: user.student_profile?.programme || '',
    email: user.email,
    status: user.student_profile?.status || (user.is_active ? 'active' : 'inactive'),
  };
}

function mapUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    status: user.is_active ? 'active' : 'inactive',
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

function OverviewTab({ overview, navigate }) {
  const { students, companies, placements, activities, audits } = overview;
  return (
    <div className={styles.twoCol}>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Cohort Completion</span></div>
        {[
          ['Registered students', students.length, '#1565c0'],
          ['Placements created', placements.length, '#7c3aed'],
          ['Activities submitted', activities.length, '#059669'],
          ['Host companies', companies.length, '#dc2626'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span style={{ color: '#6b7a99' }}>{label}</span><span style={{ fontWeight: 500, color }}>{value}</span></div>
            <div className={styles.progBar}><div className={styles.progFill} style={{ width: `${Math.min(Number(value) * 10, 100)}%`, background: color }} /></div>
          </div>
        ))}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Quick Actions</span></div>
        <div className={styles.qaGrid}>
          {[
            ['Add Student', 'Register new intern', 'students'],
            ['Create Placement', 'Link student to company', 'placements'],
            ['Manage Companies', 'Maintain host institutions', 'companies'],
            ['View Audit Log', 'Inspect system activity', 'audit'],
          ].map(([title, sub, tab]) => (
            <button key={title} className={styles.qaBtn} onClick={() => navigate(tab)}>
              <div className={styles.qaTitle}>{title}</div>
              <div className={styles.qaSub}>{sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.panel} style={{ gridColumn: '1/3' }}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Recent Activity</span></div>
        {audits.slice(0, 8).map(log => (
          <div key={log.id} style={{ display: 'flex', gap: 9, padding: '6px 0', borderBottom: '1px solid #d8dde9' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', marginTop: 3 }} />
            <div><div style={{ fontSize: 11, fontWeight: 500, color: '#1a2540' }}>{log.detail}</div><div style={{ fontSize: 10, color: '#6b7a99' }}>{log.actor_name || 'System'} · {new Date(log.created_at).toLocaleString('en-GB')}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentsTab({ showToast }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', regNo: '', year: 'Year 3', programme: 'BSc Computer Science', email: '', password: 'TempPass123!' });

  const resetForm = () => setForm({ firstName: '', lastName: '', regNo: '', year: 'Year 3', programme: 'BSc Computer Science', email: '', password: 'TempPass123!' });
  const loadStudents = async () => setStudents((await userService.fetchStudents()).map(mapStudent));

  useEffect(() => {
    void loadStudents();
  }, []);

  const save = async () => {
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!fullName || !form.regNo.trim() || !form.email.trim()) {
      showToast('First name, Reg. No. and email are required');
      return;
    }
    try {
      if (editId) {
        await userService.updateUser(editId, {
          full_name: fullName,
          email: form.email.trim().toLowerCase(),
          student_profile: {
            registration_number: form.regNo.trim(),
            programme: form.programme,
            academic_year: form.year,
            status: 'active',
          },
        });
      } else {
        await userService.createUser({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirm_password: form.password,
          full_name: fullName,
          role: 'student',
          registration_number: form.regNo.trim(),
          programme: form.programme,
          academic_year: form.year,
          status: 'active',
        });
      }
      resetForm();
      setEditId(null);
      showToast(`Student ${fullName} saved.`);
      await loadStudents();
    } catch (error) {
      showToast(error?.response?.data?.detail || error?.response?.data?.email?.[0] || error?.message || 'Could not save student.');
    }
  };

  const filtered = students.filter(student => `${student.fullName} ${student.regNo}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.twoCol}>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Student Registry ({filtered.length})</span><input className={styles.searchBox} placeholder="Search by name or reg. no..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <table className={styles.table}>
          <thead><tr><th>Student</th><th>Programme</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(student => (
              <tr key={student.id}>
                <td><div style={{ fontSize: 12, fontWeight: 500 }}>{student.fullName}</div><div style={{ fontSize: 10, color: '#6b7a99' }}>{student.regNo}</div></td>
                <td style={{ fontSize: 12, color: '#6b7a99' }}>{student.programme}</td>
                <td>{chipStatus(student.status)}</td>
                <td><div style={{ display: 'flex', gap: 5 }}><button className={styles.abEdit} onClick={() => { const [firstName, ...rest] = student.fullName.split(' '); setForm({ firstName, lastName: rest.join(' '), regNo: student.regNo, year: student.year, programme: student.programme, email: student.email, password: 'TempPass123!' }); setEditId(student.id); }}>Edit</button><button className={styles.abDel} onClick={async () => { if (!confirm(`Delete student ${student.fullName}?`)) return; await userService.deleteUser(student.id); showToast(`Student ${student.fullName} deleted.`); await loadStudents(); }}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTitle} style={{ marginBottom: 14 }}>{editId ? 'Edit Student' : 'Add New Student'}</div>
        <div className={styles.formGrid}>
          {[
            ['First name *', 'firstName', 'text'],
            ['Last name', 'lastName', 'text'],
            ['Reg. Number *', 'regNo', 'text'],
            ['Email *', 'email', 'email'],
          ].map(([label, key, type]) => (
            <div key={key} className={styles.fg} style={key === 'regNo' || key === 'email' ? { gridColumn: '1/3' } : {}}><label className={styles.fl}>{label}</label><input className={styles.fi} type={type} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} /></div>
          ))}
          <div className={styles.fg}><label className={styles.fl}>Year</label><select className={styles.fi} value={form.year} onChange={e => setForm(current => ({ ...current, year: e.target.value }))}>{['Year 1', 'Year 2', 'Year 3', 'Year 4'].map(value => <option key={value}>{value}</option>)}</select></div>
          <div className={styles.fg}><label className={styles.fl}>Programme</label><select className={styles.fi} value={form.programme} onChange={e => setForm(current => ({ ...current, programme: e.target.value }))}>{['BSc Computer Science', 'BSc Software Engineering', 'BSc Information Technology'].map(value => <option key={value}>{value}</option>)}</select></div>
        </div>
        <button className={styles.btnRedFull} onClick={save}>{editId ? 'Update Student' : 'Save Student Record'}</button>
      </div>
    </div>
  );
}

function UsersTab({ user, showToast }) {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', role: 'student', password: '' });
  const loadUsers = async () => setAllUsers((await userService.fetchAllUsers()).map(mapUser));

  useEffect(() => {
    void loadUsers();
  }, []);

  const filtered = allUsers.filter(item => `${item.fullName} ${item.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.twoCol}>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>System Users ({filtered.length})</span><input className={styles.searchBox} placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <table className={styles.table}>
          <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontSize: 12, fontWeight: 500 }}>{item.fullName}</td>
                <td>{roleChip(item.role)}</td>
                <td style={{ fontSize: 11, color: '#6b7a99' }}>{item.email}</td>
                <td>{chipStatus(item.status)}</td>
                <td><div style={{ display: 'flex', gap: 5 }}>{item.status === 'active' && <button className={styles.abEdit} onClick={async () => { await userService.updateUser(item.id, { is_active: false }); showToast(`${item.fullName}'s account disabled.`); await loadUsers(); }}>Disable</button>}{item.id !== user?.id && <button className={styles.abDel} onClick={async () => { if (!confirm(`Delete user ${item.fullName}?`)) return; await userService.deleteUser(item.id); showToast(`User ${item.fullName} deleted.`); await loadUsers(); }}>Delete</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTitle} style={{ marginBottom: 14 }}>Add New User</div>
        <div className={styles.formGrid}>
          {[
            ['Full name *', 'fullName', 'text'],
            ['Email *', 'email', 'email'],
            ['Password *', 'password', 'password'],
          ].map(([label, key, type]) => (
            <div key={key} className={styles.fg} style={{ gridColumn: '1/3' }}><label className={styles.fl}>{label}</label><input className={styles.fi} type={type} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} /></div>
          ))}
          <div className={styles.fg} style={{ gridColumn: '1/3' }}><label className={styles.fl}>Role *</label><select className={styles.fi} value={form.role} onChange={e => setForm(current => ({ ...current, role: e.target.value }))}>{['student', 'mentor', 'lecturer', 'admin'].map(value => <option key={value} value={value}>{value}</option>)}</select></div>
        </div>
        <button className={styles.btnRedFull} onClick={async () => { await userService.createUser({ email: form.email.trim().toLowerCase(), password: form.password, confirm_password: form.password, full_name: form.fullName.trim(), role: form.role }); showToast(`User ${form.fullName} created successfully.`); setForm({ fullName: '', email: '', role: 'student', password: '' }); await loadUsers(); }}>Create User Account</button>
      </div>
    </div>
  );
}

function CompaniesTab({ showToast }) {
  const [companies, setCompanies] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', sector: 'Health IT', district: 'Kampala', email: '', maxCapacity: '' });
  const loadCompanies = async () => setCompanies(await internshipService.fetchCompanies());

  useEffect(() => {
    void loadCompanies();
  }, []);

  return (
    <div className={styles.twoCol}>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Industry Partners ({companies.length})</span></div>
        <table className={styles.table}>
          <thead><tr><th>Company</th><th>Sector</th><th>District</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id}>
                <td style={{ fontSize: 12, fontWeight: 500 }}>{company.name}</td>
                <td style={{ fontSize: 12, color: '#6b7a99' }}>{company.sector}</td>
                <td style={{ fontSize: 12, color: '#6b7a99' }}>{company.district}</td>
                <td style={{ fontSize: 12 }}>{company.max_capacity}</td>
                <td>{chipStatus(company.status)}</td>
                <td><div style={{ display: 'flex', gap: 5 }}><button className={styles.abEdit} onClick={() => { setForm({ name: company.name, sector: company.sector, district: company.district, email: company.email || '', maxCapacity: String(company.max_capacity) }); setEditId(company.id); }}>Edit</button><button className={styles.abDel} onClick={async () => { await internshipService.deleteCompany(company.id); showToast(`${company.name} removed.`); await loadCompanies(); }}>Remove</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTitle} style={{ marginBottom: 14 }}>{editId ? 'Edit Company' : 'Add Industry Partner'}</div>
        <div className={styles.formGrid}>
          {[
            ['Company name *', 'name', 'text'],
            ['Contact email', 'email', 'email'],
            ['District', 'district', 'text'],
            ['Max capacity', 'maxCapacity', 'number'],
          ].map(([label, key, type]) => (
            <div key={key} className={styles.fg} style={key === 'name' || key === 'email' ? { gridColumn: '1/3' } : {}}><label className={styles.fl}>{label}</label><input className={styles.fi} type={type} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} /></div>
          ))}
          <div className={styles.fg}><label className={styles.fl}>Sector</label><select className={styles.fi} value={form.sector} onChange={e => setForm(current => ({ ...current, sector: e.target.value }))}>{['Health IT', 'Telecoms', 'Government IT', 'FinTech', 'Software'].map(value => <option key={value}>{value}</option>)}</select></div>
        </div>
        <button className={styles.btnRedFull} onClick={async () => { const payload = { name: form.name.trim(), sector: form.sector, district: form.district, email: form.email, max_capacity: Number(form.maxCapacity) || 10, status: 'active' }; if (editId) await internshipService.updateCompany(editId, payload); else await internshipService.createCompany(payload); setForm({ name: '', sector: 'Health IT', district: 'Kampala', email: '', maxCapacity: '' }); setEditId(null); showToast('Company saved.'); await loadCompanies(); }}>{editId ? 'Update Company' : 'Save Company'}</button>
      </div>
    </div>
  );
}

function PeriodsTab({ showToast }) {
  const [periods, setPeriods] = useState([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', weeks: 16 });
  const loadPeriods = async () => setPeriods(await internshipService.fetchPeriods());

  useEffect(() => {
    void loadPeriods();
  }, []);

  return (
    <div className={styles.twoCol}>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Internship Periods</span></div>
        {periods.map(period => (
          <div key={period.id} style={{ border: '1px solid #d8dde9', borderRadius: 10, padding: '13px 15px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div><div style={{ fontSize: 14, fontWeight: 500, color: '#1a2540' }}>{period.name}</div><div style={{ fontSize: 12, color: '#6b7a99' }}>{period.start_date} {'->'} {period.end_date} · {period.weeks} weeks</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{chipStatus(period.status)}<button className={period.status === 'active' ? styles.abDel : styles.abEdit} onClick={async () => { await internshipService.updatePeriod(period.id, { status: period.status === 'active' ? 'closed' : 'active' }); showToast(`Period "${period.name}" updated.`); await loadPeriods(); }}>{period.status === 'active' ? 'Close' : 'Reopen'}</button></div>
          </div>
        ))}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTitle} style={{ marginBottom: 14 }}>Create New Period</div>
        <div className={styles.formGrid}>
          <div className={styles.fg} style={{ gridColumn: '1/3' }}><label className={styles.fl}>Period name *</label><input className={styles.fi} value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} /></div>
          <div className={styles.fg}><label className={styles.fl}>Start date *</label><input className={styles.fi} type="date" value={form.startDate} onChange={e => setForm(current => ({ ...current, startDate: e.target.value }))} /></div>
          <div className={styles.fg}><label className={styles.fl}>End date *</label><input className={styles.fi} type="date" value={form.endDate} onChange={e => setForm(current => ({ ...current, endDate: e.target.value }))} /></div>
          <div className={styles.fg}><label className={styles.fl}>Weeks</label><input className={styles.fi} type="number" value={form.weeks} onChange={e => setForm(current => ({ ...current, weeks: e.target.value }))} /></div>
        </div>
        <button className={styles.btnRedFull} onClick={async () => { await internshipService.createPeriod({ name: form.name, start_date: form.startDate, end_date: form.endDate, weeks: Number(form.weeks) || 16, status: 'active' }); setForm({ name: '', startDate: '', endDate: '', weeks: 16 }); showToast(`Period "${form.name}" created.`); await loadPeriods(); }}>Create Period</button>
      </div>
    </div>
  );
}

function PlacementsTab({ showToast }) {
  const [placements, setPlacements] = useState([]);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [form, setForm] = useState({ studentId: '', companyId: '', lecturerId: '', mentorId: '', periodId: '' });

  const loadData = async () => {
    const [placementRows, studentUsers, companyRows, lecturerUsers, mentorUsers, periodRows] = await Promise.all([
      internshipService.fetchPlacements(),
      userService.fetchStudents(),
      internshipService.fetchCompanies(),
      userService.fetchLecturers(),
      userService.fetchMentors(),
      internshipService.fetchPeriods(),
    ]);
    setPlacements(placementRows);
    setStudents(studentUsers.map(mapStudent));
    setCompanies(companyRows);
    setLecturers(lecturerUsers.map(mapUser));
    setMentors(mentorUsers.map(mapUser));
    setPeriods(periodRows);
    if (!form.periodId && periodRows[0]) setForm(current => ({ ...current, periodId: periodRows[0].id }));
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className={styles.twoCol}>
      <div className={styles.panel}>
        <div className={styles.panelHdr}><span className={styles.panelTitle}>Active Placements ({placements.length})</span></div>
        <table className={styles.table}>
          <thead><tr><th>Student</th><th>Company</th><th>Lecturer</th><th>Mentor</th><th>Period</th><th>Actions</th></tr></thead>
          <tbody>
            {placements.map(placement => (
              <tr key={placement.id}>
                <td style={{ fontSize: 12, fontWeight: 500 }}>{placement.student_name}</td>
                <td style={{ fontSize: 12, color: '#6b7a99' }}>{placement.company_name}</td>
                <td style={{ fontSize: 12, color: '#6b7a99' }}>{placement.lecturer_name}</td>
                <td style={{ fontSize: 12, color: '#6b7a99' }}>{placement.mentor_name}</td>
                <td style={{ fontSize: 12 }}>{placement.period}</td>
                <td><button className={styles.abDel} onClick={async () => { await internshipService.deletePlacement(placement.id); showToast('Placement removed.'); await loadData(); }}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTitle} style={{ marginBottom: 8 }}>Create Placement</div>
        {[['Student *', <select className={styles.fi} value={form.studentId} onChange={e => setForm(current => ({ ...current, studentId: e.target.value }))}><option value="">Select student...</option>{students.map(student => <option key={student.id} value={student.id}>{student.fullName} — {student.regNo}</option>)}</select>], ['Company *', <select className={styles.fi} value={form.companyId} onChange={e => setForm(current => ({ ...current, companyId: e.target.value }))}><option value="">Select company...</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select>], ['Lecturer *', <select className={styles.fi} value={form.lecturerId} onChange={e => setForm(current => ({ ...current, lecturerId: e.target.value }))}><option value="">Select lecturer...</option>{lecturers.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select>], ['Mentor *', <select className={styles.fi} value={form.mentorId} onChange={e => setForm(current => ({ ...current, mentorId: e.target.value }))}><option value="">Select mentor...</option>{mentors.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select>], ['Period *', <select className={styles.fi} value={form.periodId} onChange={e => setForm(current => ({ ...current, periodId: e.target.value }))}><option value="">Select period...</option>{periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}</select>]].map(([label, element], index) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #d8dde9' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{index + 1}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: '#6b7a99', marginBottom: 3, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>{element}</div>
          </div>
        ))}
        <button className={styles.btnRedFull} style={{ marginTop: 12 }} onClick={async () => { await internshipService.createPlacement({ student: form.studentId, company: form.companyId, lecturer: form.lecturerId, mentor: form.mentorId, period: form.periodId }); setForm({ studentId: '', companyId: '', lecturerId: '', mentorId: '', periodId: periods[0]?.id || '' }); showToast('Placement created.'); await loadData(); }}>Create Placement</button>
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className={styles.reportsGrid}>
      {['placements', 'attendance', 'validation'].map(type => (
        <div key={type} className={styles.reportCard} style={{ '--rc': '#1565c0' }}>
          <div className={styles.reportTitle}>{type} report</div>
          <div className={styles.reportSub}>Backend-generated export</div>
          <button className={styles.reportBtn} style={{ background: '#1565c0' }} onClick={async () => { const blob = await reportingService.downloadReport(type); downloadBlob(blob, `ILES_admin_${type}_${new Date().toISOString().slice(0, 10)}.txt`); }}>Download</button>
        </div>
      ))}
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  useEffect(() => {
    reportingService.fetchAuditLogs().then(setLogs);
  }, []);
  const filtered = typeFilter === 'all' ? logs : logs.filter(log => log.event_type === typeFilter);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHdr}>
        <span className={styles.panelTitle}>System Audit Log ({logs.length} events)</span>
        <select style={{ border: '1px solid #d8dde9', borderRadius: 7, padding: '5px 10px', fontSize: 12 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All events</option>
          {['create', 'edit', 'delete', 'login', 'grade', 'validate', 'reject'].map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Role</th><th>Details</th></tr></thead>
        <tbody>
          {filtered.map(log => (
            <tr key={log.id}>
              <td style={{ fontSize: 11, color: '#6b7a99' }}>{new Date(log.created_at).toLocaleString('en-GB')}</td>
              <td style={{ fontSize: 11, fontWeight: 500 }}>{log.event_type}</td>
              <td style={{ fontSize: 11 }}>{log.actor_name || 'System'}</td>
              <td>{roleChip(log.actor_role)}</td>
              <td style={{ fontSize: 11, color: '#6b7a99' }}>{log.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard({ page }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(page || 'overview');
  const [toast, setToast] = useState('');
  const [overview, setOverview] = useState({ users: [], students: [], companies: [], placements: [], activities: [], audits: [] });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const loadOverview = async () => {
    const [users, students, companies, placements, activities, audits] = await Promise.all([
      userService.fetchAllUsers(),
      userService.fetchStudents(),
      internshipService.fetchCompanies(),
      internshipService.fetchPlacements(),
      internshipService.fetchActivities(),
      reportingService.fetchAuditLogs(),
    ]);
    setOverview({
      users: users.map(mapUser),
      students: students.map(mapStudent),
      companies,
      placements,
      activities,
      audits,
    });
  };

  useEffect(() => {
    if (page) {
      queueMicrotask(() => setActiveTab(page));
    }
  }, [page]);

  useEffect(() => {
    void loadOverview();
  }, [activeTab]);

  const navigate = (tab) => {
    setActiveTab(tab);
    window.history.pushState({}, '', `/dashboard/admin/${tab === 'overview' ? '' : tab}`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div><div className={styles.topTitle}>{TAB_LABELS[activeTab]}</div><div className={styles.topSub}>Administrative control panel</div></div>
        <div className={styles.topRight}><span className={styles.pillBlue}>Administrator</span></div>
      </div>
      <div className={styles.content}>
        {toast && <div className={styles.toast}>{toast}</div>}
        <div className={styles.statsRow}>
          {[
            ['Total Students', overview.students.length, 'Registered', 'red'],
            ['Lecturers', overview.users.filter(item => item.role === 'lecturer').length, 'Supervisors', 'sky'],
            ['Field Mentors', overview.users.filter(item => item.role === 'mentor').length, 'Industry', 'teal'],
            ['Host Companies', overview.companies.length, 'Partners', 'purple'],
            ['Placements', overview.placements.length, 'Active', 'amber'],
          ].map(([label, value, sub, cls]) => (
            <div key={label} className={`${styles.statCard} ${styles[cls]}`}>
              <div className={styles.statLbl}>{label}</div><div className={styles.statVal}>{value}</div><div className={styles.statSub}>{sub}</div>
            </div>
          ))}
        </div>
        <div className={styles.tabBar}>
          {TABS.map(tab => (
            <button key={tab} className={`${styles.tabBtn}${activeTab === tab ? ' ' + styles.tabOn : ''}`} onClick={() => navigate(tab)}>{TAB_LABELS[tab]}</button>
          ))}
        </div>
        {activeTab === 'overview' && <OverviewTab overview={overview} navigate={navigate} />}
        {activeTab === 'students' && <StudentsTab showToast={showToast} />}
        {activeTab === 'users' && <UsersTab user={user} showToast={showToast} />}
        {activeTab === 'companies' && <CompaniesTab showToast={showToast} />}
        {activeTab === 'periods' && <PeriodsTab showToast={showToast} />}
        {activeTab === 'placements' && <PlacementsTab showToast={showToast} />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
