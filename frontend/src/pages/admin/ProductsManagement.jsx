import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productService } from '../../services/productService'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Pagination from '../../components/common/Pagination'
import { getErrorMessage } from '../../services/api'

export default function ProductsManagement() {
  const navigate = useNavigate()
  const [data, setData] = useState({ items: [], total: 0, page: 1, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await productService.list({ page, page_size: 10, search: search || undefined })
      setData(res)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const handleDelete = async () => {
    try {
      await productService.remove(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">+ Add Product</Link>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2 max-w-sm">
        <input className="input-field" placeholder="Search by name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner label="Loading products..." />
      ) : (
        <>
          <DataTable
            columns={['Product', 'SKU', 'Price', 'Stock', 'Status', '']}
            rows={data.items}
            renderRow={(p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.brand}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.sku}</td>
                <td className="px-4 py-3 text-gray-600">₹{Number(p.price).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-gray-600">{p.stock_quantity}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => navigate(`/admin/products/${p.id}/edit`)} className="text-brand-600 hover:underline text-sm mr-3">Edit</button>
                  <button onClick={() => setDeleteTarget(p)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            )}
          />
          <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
