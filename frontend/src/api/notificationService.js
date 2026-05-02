import client from './client';
import { unwrapListPayload } from './helpers.js';

export const notificationService = {
  fetchNotifications:(params)=>client.get('/notifications/',{params}).then(r=>unwrapListPayload(r.data)),
  markRead:(id)=>client.patch(`/notifications/${id}/`,{is_read:true}).then(r=>r.data),
  markAllRead:()=>client.post('/notifications/mark-all-read/',{}).then(r=>r.data),
};
