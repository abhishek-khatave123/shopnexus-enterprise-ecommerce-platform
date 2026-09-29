import { useState } from 'react'
import api from '../../services/api'

const REPORTS = [
  { type: 'sales', label: 'Sales Report', description: 'All paid orders with subtotal, discount, and total amounts.' },
  { type: 'orders', label: 'Order Report', description: 'Every order with order status and payment status.' },
  { type: 'customers', label: 'Customer Report', description: 'All registered customers with join date and status.' },
  { type: 'products', label: 'Product Report', description: 'Full product catalog with pricing and stock levels.' },
  { type: 'inventory', label: 'Inventory Report', description: 'Current stock levels and low-stock flags per product.' },
]

export default function Reports() {
  const [downloading, setDownloading] = useState(null)
  const [error, setError] = useState('')

  const handleDownload = async (type) => {
    setDownloading(type)
    setError('')
    try {
      const response = await api.get(`/api/reports/${type}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}_report.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download report. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Reports</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <div key={r.type} className="card p-5 flex flex-col">
            <h2 className="font-semibold text-gray-900">{r.label}</h2>
            <p className="text-sm text-gray-500 mt-1 flex-1">{r.description}</p>
            <button
              onClick={() => handleDownload(r.type)}
              disabled={downloading === r.type}
              className="btn-secondary mt-4 self-start text-sm"
            >
              {downloading === r.type ? 'Preparing...' : 'Download CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
