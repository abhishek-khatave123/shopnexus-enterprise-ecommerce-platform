import { createContext, useContext, useState, useCallback } from 'react'
import { cartService } from '../services/cartService'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)

  const refreshCart = useCallback(async () => {
    const token = localStorage.getItem('shopnexus_token')
    if (!token) {
      setCart(null)
      return
    }
    setLoading(true)
    try {
      const data = await cartService.get()
      setCart(data)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const addToCart = async (productId, quantity = 1) => {
    const data = await cartService.addItem(productId, quantity)
    setCart(data)
    return data
  }

  const updateItem = async (itemId, quantity) => {
    const data = await cartService.updateItem(itemId, quantity)
    setCart(data)
    return data
  }

  const removeItem = async (itemId) => {
    const data = await cartService.removeItem(itemId)
    setCart(data)
    return data
  }

  const clearCart = async () => {
    await cartService.clear()
    setCart((prev) => (prev ? { ...prev, items: [], subtotal: 0, discount: 0, total: 0 } : prev))
  }

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, refreshCart, addToCart, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
