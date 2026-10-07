import client from './client';

export const iaConsumoApi = {
  getSummary: () => client.get('/ia-consumo'),
  updateBudget: (group, payload) => client.put(`/ia-consumo/${group}`, payload),
};
