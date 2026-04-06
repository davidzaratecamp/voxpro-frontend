import client from './client';

export const ojtApi = {
  // Agentes OJT
  getAgents:      (params)     => client.get('/ojt/agents', { params }),
  getAgent:       (id)         => client.get(`/ojt/agents/${id}`),
  createAgent:    (body)       => client.post('/ojt/agents', body),
  updateAgent:    (id, body)   => client.patch(`/ojt/agents/${id}`, body),
  graduateAgent:  (id, fecha)  => client.patch(`/ojt/agents/${id}`, {
    status: 'graduado',
    ...(fecha ? { fecha_graduacion: fecha } : {}),
  }),

  // Fuentes Aware para el dropdown
  getAwareSources: () => client.get('/ojt/aware-sources'),
};
