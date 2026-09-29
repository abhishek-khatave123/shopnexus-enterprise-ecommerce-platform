import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-red-600 font-bold text-lg">403</p>
      <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Access denied</h1>
      <p className="text-gray-500 mt-2 max-w-md">You don't have permission to view this page. If you believe this is a mistake, contact an administrator.</p>
      <Link to="/" className="btn-primary mt-6">Back to Home</Link>
    </div>
  )
}
