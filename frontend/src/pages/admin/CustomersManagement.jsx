import { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Pagination from '../../components/common/Pagination'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { getErrorMessage } from '../../services/api'

export default function CustomersManagement() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmTarget, setConfirmTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.listCustomers({ page, page_size: 10, search: search || undefined })
      setData(res)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const handleToggleStatus = async () => {
    try {
      await adminService.setCustomerStatus(confirmTarget.id, !confirmTarget.is_active)
      setConfirmTarget(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmTarget(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Customers</h1>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2 max-w-sm">
        <input className="input-field" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner label="Loading customers..." />
      ) : (
        <>
          <DataTable
            columns={['Name', 'Email', 'Phone', 'Orders', 'Joined', 'Status', '']}
            rows={data.items}
            renderRow={(c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.order_count}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setConfirmTarget(c)} className={`text-sm hover:underline ${c.is_active ? 'text-red-600' : 'text-green-600'}`}>
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            )}
          />
          <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.is_active ? 'Deactivate Customer' : 'Activate Customer'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} ${confirmTarget?.name}'s account?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  )
}
