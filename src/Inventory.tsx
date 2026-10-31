import { useEffect, useState, type SubmitEvent } from 'react'
import { supabase } from './supabaseClient'

type Product = {
  id: number
  name: string
  price: number
  stock: number
}

function validatePriceAndStock(price: string, stock: string) {
  if (!(Number(price) > 0)) return 'El precio debe ser mayor que 0'
  if (stock === '' || !Number.isInteger(Number(stock)) || Number(stock) < 0)
    return 'El stock debe ser un entero mayor o igual a 0'
  return ''
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editError, setEditError] = useState('')

  function loadProducts() {
    return supabase
      .from('products')
      .select('*')
      .order('id')
      .then(({ data }) => setProducts(data ?? []))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio')
    const invalid = validatePriceAndStock(price, stock)
    if (invalid) return setError(invalid)
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

  async function handleSaveEdit(id: number) {
    const invalid = validatePriceAndStock(editPrice, editStock)
    if (invalid) return setEditError(invalid)
    setEditError('')
    // Solo los campos que cambiaron: así no se pisa un stock modificado por otra venta.
    const original = products?.find((product) => product.id === id)
    const changes: { price?: number; stock?: number } = {}
    if (Number(editPrice) !== original?.price) changes.price = Number(editPrice)
    if (Number(editStock) !== original?.stock) changes.stock = Number(editStock)
    if (Object.keys(changes).length === 0) return setEditingId(null)
    setIsSaving(true)
    try {
      try {
        // RLS no devuelve error al bloquear un update: simplemente no afecta ninguna fila.
        const { data, error } = await supabase
          .from('products')
          .update(changes)
          .eq('id', id)
          .select('id')
        if (error || !data?.length) return setEditError('No se pudo guardar el producto')
      } catch {
        return setEditError('No se pudo guardar el producto')
      }
      // El guardado ya funcionó: un fallo al recargar no debe verse como fallo al guardar.
      try {
        await loadProducts()
      } catch {
        // Se queda la lista anterior.
      }
      setEditingId(null)
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                {editingId === product.id ? (
                  <>
                    <td>
                      <input
                        type="number"
                        aria-label="Precio"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        aria-label="Stock"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td>{product.price}</td>
                    <td>{product.stock}</td>
                  </>
                )}
                <td>
                  {editingId === product.id ? (
                    <>
                      {editError && <p role="alert">{editError}</p>}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveEdit(product.id)}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setEditError('')
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingId(product.id)
                        setEditError('')
                        setEditPrice(String(product.price))
                        setEditStock(String(product.stock))
                      }}
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
