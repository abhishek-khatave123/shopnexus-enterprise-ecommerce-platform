import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-brand-600 font-bold text-lg">404</p>
      <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Page not found</h1>
      <p className="text-gray-500 mt-2 max-w-md">The page you're looking for doesn't exist or may have been moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to Home</Link>
    </div>
  )
}
