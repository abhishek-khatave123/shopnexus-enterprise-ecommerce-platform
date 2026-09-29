import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.listOrders({ status: statusFilter || undefined, search: search || undefined })
      setOrders(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      const updated = await adminService.updateOrderStatus(orderId, newStatus)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Orders</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input className="input-field" placeholder="Search order number" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-secondary" type="submit">Search</button>
        </form>
        <select className="input-field w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner label="Loading orders..." />
      ) : (
        <DataTable
          columns={['Order', 'Customer', 'Date', 'Payment', 'Total', 'Status']}
          rows={orders}
          renderRow={(o) => (
            <tr key={o.id}>
              <td className="px-4 py-3"><Link to={`/orders/${o.id}`} className="text-brand-600 hover:underline font-medium">{o.order_number}</Link></td>
              <td className="px-4 py-3 text-gray-600">#{o.user_id ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{new Date(o.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-gray-600">{o.payment_status}</td>
              <td className="px-4 py-3 font-medium text-gray-900">₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3">
                <select
                  className={`text-xs font-medium px-2 py-1 rounded-lg border-0 ${STATUS_COLORS[o.order_status] || 'bg-gray-100'}`}
                  value={o.order_status}
                  disabled={updatingId === o.id}
                  onChange={(e) => handleStatusChange(o.id, e.target.value)}
                >
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  )
}
