import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { adminService } from '../../services/adminService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
]

const PIE_COLORS = ['#4f46e5', '#818cf8', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']

export default function Analytics() {
  const [period, setPeriod] = useState('30d')
  const [revenue, setRevenue] = useState([])
  const [ordersBreakdown, setOrdersBreakdown] = useState({ by_status: [], payment_statistics: [] })
  const [productAnalytics, setProductAnalytics] = useState({ top_products: [], sales_by_category: [] })
  const [newCustomers, setNewCustomers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [rev, ord, prod, cust] = await Promise.all([
        adminService.revenue(period, 'day'),
        adminService.ordersBreakdown(),
        adminService.productsAnalytics(),
        adminService.customersAnalytics(period),
      ])
      setRevenue(rev)
      setOrdersBreakdown(ord)
      setProductAnalytics(prod)
      setNewCustomers(cust.new_customers)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium ${period === p.value ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner label="Crunching numbers..." />
      ) : (
        <>
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Orders by Status</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ordersBreakdown.by_status}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Sales by Category</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={productAnalytics.sales_by_category}
                    dataKey="revenue"
                    nameKey="category"
                    outerRadius={90}
                    innerRadius={50}
                    label={(entry) => entry.category}
                  >
                    {productAnalytics.sales_by_category.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Top Selling Products</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={productAnalytics.top_products} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="product_name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="units_sold" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Payment Statistics</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={ordersBreakdown.payment_statistics} dataKey="count" nameKey="status" outerRadius={90} label={(entry) => entry.status}>
                    {ordersBreakdown.payment_statistics.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-500 mt-2 text-center">New customers in period: <strong>{newCustomers}</strong></p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
