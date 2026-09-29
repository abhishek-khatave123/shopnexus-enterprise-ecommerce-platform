import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { orderService } from '../../services/orderService'
import api, { getErrorMessage } from '../../services/api'
import ErrorMessage from '../../components/common/ErrorMessage'
import SuccessToast from '../../components/common/SuccessToast'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Profile() {
  const { user } = useAuth()
  const { register, handleSubmit, reset } = useForm()
  const [addresses, setAddresses] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [addressForm, setAddressForm] = useState({ full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India' })
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    if (user) reset({ name: user.name, phone: user.phone || '' })
  }, [user, reset])

  useEffect(() => {
    Promise.all([orderService.myAddresses(), orderService.list()])
      .then(([addr, ord]) => {
        setAddresses(addr)
        setOrders(ord.slice(0, 5))
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const onSubmitProfile = async (data) => {
    setMessage('')
    setError('')
    try {
      await api.put('/api/users/me', data)
      setMessage('Profile updated successfully')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onAddAddress = async (e) => {
    e.preventDefault()
    setAddressError('')
    try {
      const created = await orderService.addAddress(addressForm)
      setAddresses((prev) => [...prev, created])
      setAddressForm({ full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India' })
    } catch (err) {
      setAddressError(getErrorMessage(err))
    }
  }

  if (loading) return <LoadingSpinner label="Loading your profile..." />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SuccessToast message={message} />
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account Information</h2>
        <ErrorMessage message={error} />
        <form onSubmit={handleSubmit(onSubmitProfile)} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className="input-field" {...register('name')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input-field bg-gray-50" value={user?.email || ''} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input className="input-field" {...register('phone')} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Saved Addresses</h2>
        <ErrorMessage message={addressError} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {addresses.map((a) => (
            <div key={a.id} className="border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-800">{a.full_name} · {a.phone}</p>
              <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}, {a.country}</p>
            </div>
          ))}
          {addresses.length === 0 && <p className="text-sm text-gray-400">No saved addresses yet.</p>}
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-brand-600 font-medium">+ Add a new address</summary>
          <form onSubmit={onAddAddress} className="grid sm:grid-cols-2 gap-3 mt-4">
            <input className="input-field" placeholder="Full Name" value={addressForm.full_name} onChange={(e) => setAddressForm((f) => ({ ...f, full_name: e.target.value }))} required />
            <input className="input-field" placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))} required />
            <input className="input-field sm:col-span-2" placeholder="Address Line 1" value={addressForm.line1} onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))} required />
            <input className="input-field sm:col-span-2" placeholder="Address Line 2 (optional)" value={addressForm.line2} onChange={(e) => setAddressForm((f) => ({ ...f, line2: e.target.value }))} />
            <input className="input-field" placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} required />
            <input className="input-field" placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} required />
            <input className="input-field" placeholder="Postal Code" value={addressForm.postal_code} onChange={(e) => setAddressForm((f) => ({ ...f, postal_code: e.target.value }))} required />
            <input className="input-field" placeholder="Country" value={addressForm.country} onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))} required />
            <button type="submit" className="btn-secondary sm:col-span-2">Save Address</button>
          </form>
        </details>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/orders" className="text-sm text-brand-600 hover:underline">View all →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400">You haven't placed any orders yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="py-3 flex justify-between text-sm hover:text-brand-600">
                <span>{o.order_number} · {new Date(o.created_at).toLocaleDateString()}</span>
                <span className="font-medium">₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
