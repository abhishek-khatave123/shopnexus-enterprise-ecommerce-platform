import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import api, { getErrorMessage } from '../../services/api'
import ErrorMessage from '../../components/common/ErrorMessage'
import SuccessToast from '../../components/common/SuccessToast'

export default function Settings() {
  const { user } = useAuth()
  const { register, handleSubmit, reset } = useForm()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) reset({ name: user.name, phone: user.phone || '' })
  }, [user, reset])

  const onSubmit = async (data) => {
    setMessage('')
    setError('')
    try {
      await api.put('/api/users/me', data)
      setMessage('Settings updated successfully')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SuccessToast message={message} />
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Admin Profile</h2>
        <ErrorMessage message={error} />
        <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input className="input-field bg-gray-50" value={user?.role || ''} disabled />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Integration Status</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configured via backend environment variables (<code>backend/.env</code>). This page reflects your login
          role only — third-party status isn't exposed over the API for security reasons. Check the backend startup
          logs to confirm whether Razorpay, Cloudinary, and Email are configured.
        </p>
      </div>
    </div>
  )
}
