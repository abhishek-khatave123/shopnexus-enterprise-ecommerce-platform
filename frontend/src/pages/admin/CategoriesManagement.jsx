import { useEffect, useState } from 'react'
import { productService } from '../../services/productService'
import DataTable from '../../components/admin/DataTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { getErrorMessage } from '../../services/api'

export default function CategoriesManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '' })
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    productService.categories()
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const resetForm = () => {
    setForm({ name: '', description: '' })
    setEditing(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (editing) {
        await productService.updateCategory(editing.id, form)
      } else {
        await productService.createCategory(form)
      }
      resetForm()
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (cat) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '' })
  }

  const handleDelete = async () => {
    try {
      await productService.removeCategory(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Categories</h1>
      <ErrorMessage message={error} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 h-fit">
          <h2 className="font-semibold text-gray-900 mb-3">{editing ? 'Edit Category' : 'New Category'}</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">{editing ? 'Save' : 'Create'}</button>
              {editing && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <LoadingSpinner label="Loading categories..." />
          ) : (
            <DataTable
              columns={['Name', 'Slug', 'Description', '']}
              rows={categories}
              renderRow={(c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{c.description}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(c)} className="text-brand-600 hover:underline text-sm mr-3">Edit</button>
                    <button onClick={() => setDeleteTarget(c)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              )}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Products in this category will not be deleted, but you'll need to reassign them.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
