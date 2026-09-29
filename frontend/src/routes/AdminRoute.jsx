import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'

// Frontend route protection is a UX convenience only. The backend
// independently re-verifies the role on every admin API call, so a
// customer who bypasses this guard still receives HTTP 403 from the API.
export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return <LoadingSpinner label="Checking permissions..." />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/unauthorized" replace />
  return children
}
