import client from './client';
import { unwrapListPayload } from './helpers.js';

export const reportingService = {
  fetchAuditLogs:(params)=>client.get('/audit-logs/',{params}).then(r=>unwrapListPayload(r.data)),
  downloadReport:(type, params)=>client.get(`/reports/${type}/`,{params,responseType:'blob'}).then(r=>r.data),
};
