import client from './client';

export const voicebotApi = {
  getCalls: (params) => client.get('/voicebot/calls', { params }),
  getCall: (callId) => client.get(`/voicebot/calls/${callId}`),
  getAudio: (callId) => client.get(`/voicebot/calls/${callId}/audio`, { responseType: 'blob', timeout: 60000 }),
  getCallAudit: (callId) => client.get(`/voicebot/calls/${callId}/audit`),

  getPrompts: () => client.get('/voicebot/prompts'),
  savePrompt: (proyectoId, prompt_text) => client.put(`/voicebot/prompts/${proyectoId}`, { prompt_text }),

  getAuditSettings: () => client.get('/voicebot/audit-settings'),
  enableAutoAudit: () => client.post('/voicebot/audit-settings/enable'),
  disableAutoAudit: () => client.post('/voicebot/audit-settings/disable'),

  getStats: (days) => client.get('/voicebot/stats', { params: { days } }),
};
