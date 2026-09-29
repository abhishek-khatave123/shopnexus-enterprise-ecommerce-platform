import api from './api'

export const orderService = {
  checkout: (address) => api.post('/api/orders', { address }).then((r) => r.data),
  list: () => api.get('/api/orders').then((r) => r.data),
  get: (id) => api.get(`/api/orders/${id}`).then((r) => r.data),
  myAddresses: () => api.get('/api/users/me/addresses').then((r) => r.data),
  addAddress: (data) => api.post('/api/users/me/addresses', data).then((r) => r.data),
}
