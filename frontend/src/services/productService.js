import api from './api'

export const productService = {
  list: (params) => api.get('/api/products', { params }).then((r) => r.data),
  get: (id) => api.get(`/api/products/${id}`).then((r) => r.data),
  create: (data) => api.post('/api/products', data).then((r) => r.data),
  update: (id, data) => api.put(`/api/products/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/api/products/${id}`).then((r) => r.data),
  categories: () => api.get('/api/categories').then((r) => r.data),
  createCategory: (data) => api.post('/api/categories', data).then((r) => r.data),
  updateCategory: (id, data) => api.put(`/api/categories/${id}`, data).then((r) => r.data),
  removeCategory: (id) => api.delete(`/api/categories/${id}`).then((r) => r.data),
  reviews: (productId) => api.get(`/api/reviews/product/${productId}`).then((r) => r.data),
  submitReview: (data) => api.post('/api/reviews', data).then((r) => r.data),
}
