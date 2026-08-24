import client from './client';

export const voicebotApi = {
  getCalls: (params) => client.get('/voicebot/calls', { params }),
  getCall: (callId) => client.get(`/voicebot/calls/${callId}`),
  getAudio: (callId) => client.get(`/voicebot/calls/${callId}/audio`, { responseType: 'blob', timeout: 60000 }),
  getCallAudit: (callId) => client.get(`/voicebot/calls/${callId}/audit`),
  getContinuation: (callId) => client.get(`/voicebot/calls/${callId}/continuation`, { timeout: 120000 }),
  getContinuationAudio: (callId) => client.get(`/voicebot/calls/${callId}/continuation/audio`, { responseType: 'blob', timeout: 60000 }),
  markContinuationDelivered: (callId) => client.post(`/voicebot/calls/${callId}/continuation/deliver`),

  getPrompts: () => client.get('/voicebot/prompts'),
  savePrompt: (proyectoId, prompt_text) => client.put(`/voicebot/prompts/${proyectoId}`, { prompt_text }),

  getAuditSettings: () => client.get('/voicebot/audit-settings'),
  enableAutoAudit: (proyectoId) => client.post(`/voicebot/audit-settings/${proyectoId}/enable`),
  disableAutoAudit: (proyectoId) => client.post(`/voicebot/audit-settings/${proyectoId}/disable`),

  getStats: (days) => client.get('/voicebot/stats', { params: { days } }),
};
