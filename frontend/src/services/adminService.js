import api from './api'

export const adminService = {
  overview: () => api.get('/api/analytics/overview').then((r) => r.data),
  revenue: (period, group_by = 'day') => api.get('/api/analytics/revenue', { params: { period, group_by } }).then((r) => r.data),
  ordersBreakdown: () => api.get('/api/analytics/orders').then((r) => r.data),
  productsAnalytics: () => api.get('/api/analytics/products').then((r) => r.data),
  customersAnalytics: (period) => api.get('/api/analytics/customers', { params: { period } }).then((r) => r.data),

  listOrders: (params) => api.get('/api/admin/orders', { params }).then((r) => r.data),
  updateOrderStatus: (orderId, order_status) => api.put(`/api/admin/orders/${orderId}/status`, { order_status }).then((r) => r.data),
  listAllProducts: () => api.get('/api/admin/products').then((r) => r.data),

  listInventory: (lowStockOnly = false) => api.get('/api/inventory', { params: { low_stock_only: lowStockOnly } }).then((r) => r.data),
  updateInventory: (productId, data) => api.put(`/api/inventory/${productId}`, data).then((r) => r.data),

  listPayments: (status) => api.get('/api/admin/payments', { params: { status } }).then((r) => r.data),

  listCustomers: (params) => api.get('/api/admin/customers', { params }).then((r) => r.data),
  getCustomer: (id) => api.get(`/api/admin/customers/${id}`).then((r) => r.data),
  getCustomerOrders: (id) => api.get(`/api/admin/customers/${id}/orders`).then((r) => r.data),
  setCustomerStatus: (id, is_active) => api.put(`/api/admin/customers/${id}/status`, null, { params: { is_active } }).then((r) => r.data),

  reportUrl: (type) => `${api.defaults.baseURL}/api/reports/${type}`,
}
