import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type Product = {
  id: number
  name: string
  price: number
  stock: number
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[] | null>(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  return (
    <main>
      <h1>Inventario</h1>
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
