import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { orderService } from '../../services/orderService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import { getErrorMessage } from '../../services/api'

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    orderService.list()
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner label="Loading your orders..." />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
      <ErrorMessage message={error} />

      {!error && orders.length === 0 && (
        <EmptyState
          title="No orders yet"
          description="Once you place an order, it will show up here."
          action={<Link to="/products" className="btn-primary mt-4 inline-block">Start Shopping</Link>}
        />
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold text-gray-900">{order.order_number}</p>
              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()} · {order.items.length} item(s)</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.order_status] || 'bg-gray-100 text-gray-700'}`}>
                {order.order_status}
              </span>
              <span className="font-bold text-gray-900">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
