import api from './api'

export const paymentService = {
  createOrder: (orderId) => api.post('/api/payments/create-order', { order_id: orderId }).then((r) => r.data),
  verify: (data) => api.post('/api/payments/verify', data).then((r) => r.data),
  get: (id) => api.get(`/api/payments/${id}`).then((r) => r.data),
}
