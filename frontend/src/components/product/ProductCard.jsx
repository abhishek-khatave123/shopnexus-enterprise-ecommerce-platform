import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const [imgError, setImgError] = useState(false)
  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price)
  const image = product.images?.[0]?.image_url
  const outOfStock = product.stock_quantity <= 0

  return (
    <Link to={`/products/${product.id}`} className="card overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {image && !imgError ? (
          <img
            src={image}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16v16H4V4z" />
          </svg>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">Out of Stock</span>
        )}
        {hasDiscount && !outOfStock && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">Sale</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{product.brand || 'ShopNexus'}</p>
        <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">
            ₹{Number(hasDiscount ? product.discount_price : product.price).toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">₹{Number(product.price).toLocaleString('en-IN')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
