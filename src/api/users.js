import client from './client';

export const usersApi = {
  getAll:       ()           => client.get('/users'),
  create:       (body)       => client.post('/users', body),
  update:       (id, body)   => client.put(`/users/${id}`, body),
  toggleActive: (id)         => client.patch(`/users/${id}/active`),
};
