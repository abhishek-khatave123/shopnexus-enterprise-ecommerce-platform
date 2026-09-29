import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

export default function Cart() {
  const { cart, loading, updateItem, removeItem } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState(null)

  const handleQuantityChange = async (itemId, quantity) => {
    if (quantity < 1) return
    setError('')
    setBusyItemId(itemId)
    try {
      await updateItem(itemId, quantity)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyItemId(null)
    }
  }

  const handleRemove = async (itemId) => {
    setError('')
    setBusyItemId(itemId)
    try {
      await removeItem(itemId)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyItemId(null)
    }
  }

  if (loading && !cart) return <LoadingSpinner label="Loading your cart..." />

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <EmptyState
          title="Your cart is empty"
          description="Looks like you haven't added anything yet."
          action={<Link to="/products" className="btn-primary mt-4 inline-block">Browse Products</Link>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>
      <ErrorMessage message={error} />

      <div className="grid md:grid-cols-3 gap-8 mt-4">
        <div className="md:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4 items-center">
              <div className="h-20 w-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {item.product.images?.[0]?.image_url ? (
                  <img src={item.product.images[0].image_url} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16v16H4V4z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product.id}`} className="font-semibold text-gray-900 hover:text-brand-600 truncate block">
                  {item.product.name}
                </Link>
                <p className="text-sm text-gray-500">
                  ₹{Number(item.product.discount_price ?? item.product.price).toLocaleString('en-IN')} each
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      disabled={busyItemId === item.id}
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="px-2 py-1 text-gray-600 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                    <button
                      disabled={busyItemId === item.id}
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="px-2 py-1 text-gray-600 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <button
                    disabled={busyItemId === item.id}
                    onClick={() => handleRemove(item.id)}
                    className="text-sm text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="font-semibold text-gray-900">₹{Number(item.line_total).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>

        <div className="card p-6 h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{Number(cart.subtotal).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">−₹{Number(cart.discount).toLocaleString('en-IN')}</span></div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
              <span>Total</span><span>₹{Number(cart.total).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-6">Proceed to Checkout</button>
        </div>
      </div>
    </div>
  )
}
