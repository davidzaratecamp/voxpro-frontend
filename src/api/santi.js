import client from './client';

export const santiApi = {
  importExcel: (file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/santi/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getSummary: () => client.get('/santi/summary'),
  list: (params) => client.get('/santi/audits', { params }),
  exportRows: (params) => client.get('/santi/export', { params }),
  processBatch: () => client.post('/santi/process'),
};
