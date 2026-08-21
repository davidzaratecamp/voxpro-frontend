import client from './client';

export const sofiaHumanApi = {
  getCallsForDay: (params) => client.get('/sofia-human/calls', { params }),
  selectOne: (registro_llamada_id, proyecto_id) =>
    client.post('/sofia-human/select', { registro_llamada_id, proyecto_id }),
  listSelections: (params) => client.get('/sofia-human/selections', { params }),

  getSelection: (id) => client.get(`/sofia-human/selections/${id}`),
  updateSelection: (id, payload) => client.patch(`/sofia-human/selections/${id}`, payload),
  getAudio: (id) => client.get(`/sofia-human/selections/${id}/audio`, { responseType: 'blob', timeout: 60000 }),
  saveScore: (id, payload) => client.post(`/sofia-human/selections/${id}/score`, payload),
  analyze: (id) => client.post(`/sofia-human/selections/${id}/analyze`, {}, { timeout: 300000 }),

  getCriteriaTemplate: (clientCode) => client.get(`/sofia-human/criteria/${clientCode}`),
};
