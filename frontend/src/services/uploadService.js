import api from './api'

export const uploadService = {
  uploadProductImage: (productId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api
      .post(`/api/uploads/product-image?product_id=${productId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
