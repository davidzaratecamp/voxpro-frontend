import client from './client';

export const avayaApi = {
  // Agentes
  getAgents: () => client.get('/avaya/agents'),
  createAgent: (body) => client.post('/avaya/agents', body),
  updateAgent: (id, body) => client.patch(`/avaya/agents/${id}`, body),

  // Grabaciones
  uploadRecording: (formData) =>
    client.post('/avaya/recordings/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  getRecordings: (params) => client.get('/avaya/recordings', { params }),
};
