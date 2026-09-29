import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { getErrorMessage } from '../../services/api'
import ErrorMessage from '../../components/common/ErrorMessage'

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const { login } = useAuth()
  const { refreshCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data) => {
    setError('')
    setSubmitting(true)
    try {
      await login(data.email, data.password)
      await refreshCart()
      const redirectTo = location.state?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-gray-500 text-sm mb-6">Sign in to continue to your account.</p>

      <ErrorMessage message={error} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="input-field"
            placeholder="you@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            className="input-field"
            placeholder="••••••••"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
          <div className="text-right mt-1">
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account? <Link to="/register" className="text-brand-600 font-medium hover:underline">Sign up</Link>
      </p>

      <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">
        <p className="font-semibold text-gray-500 mb-1">Demo credentials</p>
        <p>Admin: admin@shopnexus.com / Passw0rd!123</p>
        <p>Customer: customer@shopnexus.com / Passw0rd!123</p>
      </div>
    </div>
  )
}
