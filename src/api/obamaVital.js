import client from './client';

export const obamaVitalApi = {
  getCallsForDay: (params) => client.get('/obama-vital/calls', { params }),
  selectOne: (registro_llamada_id) => client.post('/obama-vital/select', { registro_llamada_id }),
  listAudits: (params) => client.get('/obama-vital/audits', { params }),
  getSummary: (params) => client.get('/obama-vital/summary', { params }),

  getAudit: (id) => client.get(`/obama-vital/audits/${id}`),
  updateAudit: (id, payload) => client.patch(`/obama-vital/audits/${id}`, payload),
  getAudio: (id) => client.get(`/obama-vital/audits/${id}/audio`, { responseType: 'blob', timeout: 120000 }),
  saveScore: (id, payload) => client.post(`/obama-vital/audits/${id}/score`, payload),
  analyze: (id) => client.post(`/obama-vital/audits/${id}/analyze`, {}, { timeout: 300000 }),

  getCriteriaTemplate: (campaign) => client.get(`/obama-vital/criteria/${campaign}`),
};

export const OBAMA_VITAL_CAMPAIGNS = [
  { value: 'bienvenida', label: 'Bienvenida' },
  { value: 'customer',   label: 'ObamaCus' },
];

export const OBAMA_VITAL_STATUS = {
  selected:  { label: 'Pendiente',   style: 'bg-yellow-50 text-yellow-700' },
  in_review: { label: 'Por revisar', style: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completada',  style: 'bg-emerald-50 text-emerald-700' },
  skipped:   { label: 'Omitida',     style: 'bg-slate-100 text-slate-500' },
};
