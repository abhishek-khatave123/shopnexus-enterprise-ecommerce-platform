import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../../services/authService'
import { getErrorMessage } from '../../services/api'
import ErrorMessage from '../../components/common/ErrorMessage'

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data) => {
    setError('')
    setSubmitting(true)
    try {
      await authService.forgotPassword(data.email)
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm">
          If that email is registered with ShopNexus, we&apos;ve sent a password reset link to it.
        </p>
        <Link to="/login" className="btn-primary inline-block mt-6">Back to Sign In</Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot your password?</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>

      <ErrorMessage message={error} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className="input-field" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Remembered it? <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
