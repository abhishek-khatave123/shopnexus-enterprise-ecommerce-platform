export default function SuccessToast({ message }) {
  if (!message) return null
  return (
    <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg z-50 animate-pulse">
      {message}
    </div>
  )
}
