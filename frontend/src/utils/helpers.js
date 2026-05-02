export const formatUGX = (n) =>
  new Intl.NumberFormat('en-UG',{style:'currency',currency:'UGX',maximumFractionDigits:0}).format(n);
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-UG',{day:'numeric',month:'short',year:'numeric'});
export const getInitials = (name='') =>
  name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
const AV = ['#1565c0','#7c3aed','#059669','#dc2626','#d97706','#0f766e','#be185d'];
export const avatarColor = (i) => AV[i%AV.length];
export const calcWeightedScore = ({skills=0,professionalism=0,development=0,deliverables=0}) =>
  Math.round(skills*0.3+professionalism*0.25+development*0.25+deliverables*0.2);
export const scoreToGrade = (s) => s>=80?'A':s>=70?'B':s>=60?'C':s>=50?'D':'F';
export const ROLE_LABELS = {student:'Student',mentor:'Field Mentor',lecturer:'Lecturer',admin:'Administrator'};
export const ROLE_ROUTES = {student:'/dashboard/student',mentor:'/dashboard/mentor',lecturer:'/dashboard/lecturer',admin:'/dashboard/admin'};