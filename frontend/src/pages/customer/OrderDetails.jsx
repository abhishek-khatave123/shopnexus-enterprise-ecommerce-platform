import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { orderService } from '../../services/orderService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const PAYMENT_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
}

export default function OrderDetails() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    orderService.get(id)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner label="Loading order..." />
  if (error) return <div className="max-w-3xl mx-auto py-16 px-4"><ErrorMessage message={error} /></div>
  if (!order) return null

  let shippingAddress = {}
  try { shippingAddress = JSON.parse(order.shipping_address) } catch { /* ignore malformed */ }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/orders" className="text-sm text-brand-600 hover:underline">← Back to Orders</Link>

      <div className="card p-6 mt-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
            <p className="text-sm text-gray-500">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.order_status] || 'bg-gray-100'}`}>
              {order.order_status}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAYMENT_COLORS[order.payment_status] || 'bg-gray-100'}`}>
              Payment: {order.payment_status}
            </span>
          </div>
        </div>

        <div className="mt-6 divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">{item.product_name}</p>
                <p className="text-gray-500">Qty {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
              </div>
              <span className="font-semibold text-gray-900">₹{Number(item.line_total).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{Number(order.subtotal_amount).toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">−₹{Number(order.discount_amount).toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{Number(order.total_amount).toLocaleString('en-IN')}</span></div>
        </div>

        {shippingAddress?.full_name && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-1">Shipping Address</p>
            <p>{shippingAddress.full_name} · {shippingAddress.phone}</p>
            <p>{shippingAddress.line1}{shippingAddress.line2 ? `, ${shippingAddress.line2}` : ''}</p>
            <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}, {shippingAddress.country}</p>
          </div>
        )}
      </div>
    </div>
  )
}
