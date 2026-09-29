import { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

const STATUS_COLORS = {
  IN_STOCK: 'bg-green-100 text-green-700',
  LOW_STOCK: 'bg-yellow-100 text-yellow-700',
  OUT_OF_STOCK: 'bg-red-100 text-red-700',
}

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editValues, setEditValues] = useState({})
  const [savingId, setSavingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.listInventory(lowStockOnly)
      setInventory(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [lowStockOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (productId, field, value) => {
    setEditValues((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }))
  }

  const handleSave = async (item) => {
    const edits = editValues[item.product_id] || {}
    if (Object.keys(edits).length === 0) return
    setSavingId(item.product_id)
    try {
      const updated = await adminService.updateInventory(item.product_id, {
        quantity: edits.quantity !== undefined ? Number(edits.quantity) : undefined,
        low_stock_threshold: edits.low_stock_threshold !== undefined ? Number(edits.low_stock_threshold) : undefined,
      })
      setInventory((prev) => prev.map((i) => (i.product_id === item.product_id ? updated : i)))
      setEditValues((prev) => { const next = { ...prev }; delete next[item.product_id]; return next })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Show low-stock &amp; out-of-stock only
        </label>
      </div>

      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner label="Loading inventory..." />
      ) : (
        <DataTable
          columns={['Product', 'SKU', 'Quantity', 'Low Stock Threshold', 'Status', '']}
          rows={inventory}
          renderRow={(item) => (
            <tr key={item.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{item.product_name}</td>
              <td className="px-4 py-3 text-gray-500">{item.sku}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  className="input-field w-24 py-1"
                  defaultValue={item.quantity}
                  onChange={(e) => handleChange(item.product_id, 'quantity', e.target.value)}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  className="input-field w-24 py-1"
                  defaultValue={item.low_stock_threshold}
                  onChange={(e) => handleChange(item.product_id, 'low_stock_threshold', e.target.value)}
                />
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100'}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSave(item)}
                  disabled={savingId === item.product_id || !editValues[item.product_id]}
                  className="text-brand-600 hover:underline text-sm disabled:opacity-40 disabled:no-underline"
                >
                  {savingId === item.product_id ? 'Saving...' : 'Save'}
                </button>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  )
}
