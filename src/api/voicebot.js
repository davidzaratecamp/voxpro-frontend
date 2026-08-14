import client from './client';

export const voicebotApi = {
  getCalls: (params) => client.get('/voicebot/calls', { params }),
  getCall: (callId) => client.get(`/voicebot/calls/${callId}`),
  getAudio: (callId) => client.get(`/voicebot/calls/${callId}/audio`, { responseType: 'blob', timeout: 60000 }),
};
