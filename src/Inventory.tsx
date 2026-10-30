import { useEffect, useState, type SubmitEvent } from 'react'
import { supabase } from './supabaseClient'

type Product = {
  id: number
  name: string
  price: number
  stock: number
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function loadProducts() {
    return supabase
      .from('products')
      .select('*')
      .then(({ data }) => setProducts(data ?? []))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio')
    if (!(Number(price) > 0)) return setError('El precio debe ser mayor que 0')
    if (stock === '' || !Number.isInteger(Number(stock)) || Number(stock) < 0)
      return setError('El stock debe ser un entero mayor o igual a 0')
    setError('')
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('products')
        .insert({ name: name.trim(), price: Number(price), stock: Number(stock) })
      if (error) return setError('No se pudo guardar el producto')
      setName('')
      setPrice('')
      setStock('')
      await loadProducts()
    } catch {
      setError('No se pudo guardar el producto')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main>
      <h1>Inventario</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Precio
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label>
          Stock
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSaving}>
          Guardar producto
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      {products?.length === 0 && <p>No hay productos todavía.</p>}
      {products && products.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.price}</td>
                <td>{product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
