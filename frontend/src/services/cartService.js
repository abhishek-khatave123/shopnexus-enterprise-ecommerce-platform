import api from './api'

export const cartService = {
  get: () => api.get('/api/cart').then((r) => r.data),
  addItem: (productId, quantity = 1) => api.post('/api/cart/items', { product_id: productId, quantity }).then((r) => r.data),
  updateItem: (itemId, quantity) => api.put(`/api/cart/items/${itemId}`, { quantity }).then((r) => r.data),
  removeItem: (itemId) => api.delete(`/api/cart/items/${itemId}`).then((r) => r.data),
  clear: () => api.delete('/api/cart').then((r) => r.data),
}
