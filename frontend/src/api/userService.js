import client from './client';
import { unwrapListPayload } from './helpers.js';
export const userService = {
  createUser:(d)=>client.post('/users/',d).then(r=>r.data),
  fetchCurrentUser:()=>client.get('/users/me/').then(r=>r.data),
  updateCurrentUser:(d)=>client.patch('/users/me/',d).then(r=>r.data),
  changePassword:(d)=>client.post('/users/change-password/',d).then(r=>r.data),
  fetchAllUsers:()=>client.get('/users/').then(r=>unwrapListPayload(r.data)),
  updateUser:(id,d)=>client.patch(`/users/${id}/`,d).then(r=>r.data),
  deleteUser:(id)=>client.delete(`/users/${id}/`).then(r=>r.data),
  fetchStudents:()=>client.get('/users/students/').then(r=>unwrapListPayload(r.data)),
  fetchMentors:()=>client.get('/users/mentors/').then(r=>unwrapListPayload(r.data)),
  fetchLecturers:()=>client.get('/users/lecturers/').then(r=>unwrapListPayload(r.data)),
};
