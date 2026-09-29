import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useCart } from '../../context/CartContext'
import { orderService } from '../../services/orderService'
import { paymentService } from '../../services/paymentService'
import ErrorMessage from '../../components/common/ErrorMessage'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getErrorMessage } from '../../services/api'

const STEPS = ['Address', 'Summary', 'Payment', 'Confirmation']

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Checkout() {
  const { cart, loading: cartLoading, refreshCart } = useCart()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { country: 'India' },
  })

  const [step, setStep] = useState(0)
  const [address, setAddress] = useState(null)
  const [order, setOrder] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!cartLoading && (!cart || cart.items.length === 0) && step === 0) {
      navigate('/cart', { replace: true })
    }
  }, [cart, cartLoading, step, navigate])

  const handleAddressSubmit = (data) => {
    setAddress(data)
    setStep(1)
  }

  const handlePlaceOrder = async () => {
    setError('')
    setSubmitting(true)
    try {
      const createdOrder = await orderService.checkout(address)
      setOrder(createdOrder)
      await refreshCart()
      setStep(2)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = async () => {
    setError('')
    setSubmitting(true)
    try {
      const result = await paymentService.createOrder(order.id);

      if (!result.configured) {
        // Razorpay isn't configured on the backend — show a clear message
        // instead of pretending payment succeeded.
        setPaymentInfo({ configured: false, message: result.message });
        setSubmitting(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load the payment gateway. Please check your connection and try again.');
        setSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: result.razorpay_key_id,
        amount: Math.round(Number(result.amount) * 100),
        currency: result.currency,
        name: 'ShopNexus',
        description: `Order ${order.order_number}`,
        order_id: result.razorpay_order_id,
        handler: async (response) => {
          try {
            await paymentService.verify({
              order_id: order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentInfo({ configured: true, success: true });
            setStep(3);
          } catch (err) {
            setError(getErrorMessage(err));
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
        theme: { color: '#4f46e5' },
      });
      rzp.open();
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (cartLoading && step === 0) return <LoadingSpinner label="Loading checkout..." />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              idx <= step ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {idx + 1}
            </div>
            <span className={`text-sm ${idx <= step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
            {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <ErrorMessage message={error} />

      {step === 0 && (
        <form onSubmit={handleSubmit(handleAddressSubmit)} className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Shipping Address</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input-field" {...register('full_name', { required: 'Required' })} />
              {errors.full_name && <p className="text-red-600 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input-field" {...register('phone', { required: 'Required' })} />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input className="input-field" {...register('line1', { required: 'Required' })} />
              {errors.line1 && <p className="text-red-600 text-xs mt-1">{errors.line1.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (optional)</label>
              <input className="input-field" {...register('line2')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="input-field" {...register('city', { required: 'Required' })} />
              {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className="input-field" {...register('state', { required: 'Required' })} />
              {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input className="input-field" {...register('postal_code', { required: 'Required' })} />
              {errors.postal_code && <p className="text-red-600 text-xs mt-1">{errors.postal_code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input className="input-field" {...register('country', { required: 'Required' })} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">Continue to Summary</button>
        </form>
      )}

      {step === 1 && cart && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Order Summary</h2>
          <div className="divide-y divide-gray-100">
            {cart.items.map((item) => (
              <div key={item.id} className="py-2 flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span className="font-medium">₹{Number(item.line_total).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{Number(cart.subtotal).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">−₹{Number(cart.discount).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{Number(cart.total).toLocaleString('en-IN')}</span></div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-800">Shipping to:</p>
            <p>{address?.full_name}, {address?.line1}{address?.line2 ? `, ${address.line2}` : ''}, {address?.city}, {address?.state} {address?.postal_code}, {address?.country}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
            <button onClick={handlePlaceOrder} disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Placing order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && order && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Payment</h2>
          <p className="text-sm text-gray-600">Order <span className="font-medium">{order.order_number}</span> has been created. Complete payment to confirm it.</p>
          <div className="flex justify-between font-bold text-lg">
            <span>Amount Due</span><span>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
          </div>

          {paymentInfo && !paymentInfo.configured && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
              {paymentInfo.message}
              <p className="mt-2">Your order has been saved as <strong>Pending Payment</strong>. An admin can confirm it manually, or you can retry once payments are configured.</p>
            </div>
          )}

          <button onClick={handlePay} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Processing...' : 'Pay with Razorpay'}
          </button>
          <Link to={`/orders/${order.id}`} className="block text-center text-sm text-brand-600 hover:underline">
            View order details instead
          </Link>
        </div>
      )}

      {step === 3 && order && (
        <div className="card p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-500 mt-2">Order <strong>{order.order_number}</strong> has been confirmed. A confirmation email has been sent to your inbox.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to={`/orders/${order.id}`} className="btn-primary">View Order</Link>
            <Link to="/products" className="btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      )}
    </div>
  )
}
