import client from './client';

export const sofiaHumanApi = {
  getCallsForDay: (params) => client.get('/sofia-human/calls', { params }),
  selectOne: (registro_llamada_id, proyecto_id) =>
    client.post('/sofia-human/select', { registro_llamada_id, proyecto_id }),
  listSelections: (params) => client.get('/sofia-human/selections', { params }),
  getCommercialStats: (params) => client.get('/sofia-human/commercial-stats', { params }),
  getFeedback: (params) => client.get('/sofia-human/feedback', { params }),
  getFeedbackMonitor: (params) => client.get('/sofia-human/feedback-monitor', { params }),
  getAgentWeekly: (params) => client.get('/sofia-human/agents-weekly', { params }),
  exportAgentWeekly: (params) => client.get('/sofia-human/agents-weekly/export', { params, responseType: 'blob', timeout: 120000 }),
  getAgentWeekAudits:(agenteId, params) => client.get(`/sofia-human/agents-weekly/${encodeURIComponent(agenteId)}/audits`, { params }),
  getContinuation: (id) => client.get(`/sofia-human/continuations/${id}`),
  countContinuationsExport: (params) => client.get('/sofia-human/continuations-export/count', { params }),
  exportContinuations: (params) => client.get('/sofia-human/continuations-export', { params, responseType: 'blob', timeout: 600000 }),
  getContinuationAudio: (id) => client.get(`/sofia-human/continuations/${id}/audio`, { responseType: 'blob', timeout: 60000 }),

  getSelection: (id) => client.get(`/sofia-human/selections/${id}`),
  updateSelection: (id, payload) => client.patch(`/sofia-human/selections/${id}`, payload),
  getAudio: (id) => client.get(`/sofia-human/selections/${id}/audio`, { responseType: 'blob', timeout: 60000 }),
  saveScore: (id, payload) => client.post(`/sofia-human/selections/${id}/score`, payload),
  analyze: (id) => client.post(`/sofia-human/selections/${id}/analyze`, {}, { timeout: 300000 }),

  getCriteriaTemplate: (clientCode) => client.get(`/sofia-human/criteria/${clientCode}`),
};
