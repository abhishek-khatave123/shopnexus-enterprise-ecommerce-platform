import { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
}

export default function PaymentsManagement() {
  const [payments, setPayments] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    adminService.listPayments(statusFilter || undefined)
      .then(setPayments)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Payments</h1>
        <select className="input-field w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner label="Loading payments..." />
      ) : (
        <DataTable
          columns={['Payment ID', 'Order ID', 'Amount', 'Currency', 'Status']}
          rows={payments}
          renderRow={(p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 text-gray-600">#{p.id}</td>
              <td className="px-4 py-3 text-gray-600">#{p.order_id}</td>
              <td className="px-4 py-3 font-medium text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3 text-gray-600">{p.currency}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100'}`}>
                  {p.status}
                </span>
              </td>
            </tr>
          )}
        />
      )}

      <p className="text-xs text-gray-400 mt-4">
        Payments are created via Razorpay and verified server-side using HMAC signature checks before being marked PAID.
        If Razorpay isn't configured in the backend .env, no live payments will appear here — see PaymentsManagement docs.
      </p>
    </div>
  )
}
