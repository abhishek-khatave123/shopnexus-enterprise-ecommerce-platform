import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { productService } from '../../services/productService'
import { uploadService } from '../../services/uploadService'
import ErrorMessage from '../../components/common/ErrorMessage'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getErrorMessage } from '../../services/api'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const [categories, setCategories] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [productId, setProductId] = useState(id ? Number(id) : null)

  useEffect(() => {
    productService.categories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    productService.get(id).then((p) => {
      reset({
        name: p.name,
        description: p.description,
        price: p.price,
        discount_price: p.discount_price,
        sku: p.sku,
        category_id: p.category_id,
        brand: p.brand,
        stock_quantity: p.stock_quantity,
        is_active: p.is_active,
      })
      setImages(p.images || [])
      setLoading(false)
    }).catch((err) => {
      setError(getErrorMessage(err))
      setLoading(false)
    })
  }, [id, isEdit, reset])

  const onSubmit = async (data) => {
    setError('')
    setSubmitting(true)
    const payload = {
      ...data,
      price: Number(data.price),
      discount_price: data.discount_price ? Number(data.discount_price) : null,
      category_id: Number(data.category_id),
      stock_quantity: Number(data.stock_quantity),
      is_active: Boolean(data.is_active),
    }
    try {
      if (isEdit) {
        await productService.update(id, payload)
        navigate('/admin/products')
      } else {
        const created = await productService.create(payload)
        setProductId(created.id)
        // Stay on page so admin can upload images for the newly created product.
        navigate(`/admin/products/${created.id}/edit`, { replace: true })
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !productId) return
    setUploadError('')
    setUploading(true)
    try {
      const image = await uploadService.uploadProductImage(productId, file)
      setImages((prev) => [...prev, image])
    } catch (err) {
      setUploadError(getErrorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) return <LoadingSpinner label="Loading product..." />

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
      <ErrorMessage message={error} />

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input className="input-field" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={3} {...register('description')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input className="input-field" {...register('sku', { required: 'Required' })} />
            {errors.sku && <p className="text-red-600 text-xs mt-1">{errors.sku.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input className="input-field" {...register('brand')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="input-field" {...register('category_id', { required: 'Required' })}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.category_id && <p className="text-red-600 text-xs mt-1">{errors.category_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
            <input type="number" className="input-field" {...register('stock_quantity', { required: 'Required', min: 0 })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
            <input type="number" step="0.01" className="input-field" {...register('price', { required: 'Required', min: 0.01 })} />
            {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (₹, optional)</label>
            <input type="number" step="0.01" className="input-field" {...register('discount_price')} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" defaultChecked {...register('is_active')} />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible to customers)</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
          <button type="button" onClick={() => navigate('/admin/products')} className="btn-secondary">Cancel</button>
        </div>
      </form>

      {productId && (
        <div className="card p-6 mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Product Images</h2>
          <ErrorMessage message={uploadError} />
          <div className="flex flex-wrap gap-3 mb-4">
            {images.map((img) => (
              <div key={img.id} className="h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <label className="btn-secondary inline-block cursor-pointer text-sm">
            {uploading ? 'Uploading...' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
          <p className="text-xs text-gray-400 mt-2">
            Images are uploaded to Cloudinary. If Cloudinary isn't configured on the backend, you'll see a clear error here instead of a silent failure.
          </p>
        </div>
      )}
    </div>
  )
}
