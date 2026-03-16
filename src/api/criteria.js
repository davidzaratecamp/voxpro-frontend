import client from './client';

export const criteriaApi = {
  getAll: () => client.get('/criteria'),
  update: (key, body) => client.put(`/criteria/${key}`, body),
};
