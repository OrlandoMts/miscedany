import { useEffect, useState, type SubmitEvent } from 'react'
import Inventory, { type Role } from './Inventory'
import Sellers from './Sellers'
import { supabase } from './supabaseClient'

export default function App() {
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const hasSession = userId !== null
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)
  const [screen, setScreen] = useState<'inventory' | 'sellers'>('inventory')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUserId(session?.user.id ?? null),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setRole(null)
    setScreen('inventory')
    if (!userId) return
    // Si el usuario cambia antes de que llegue la respuesta, esa respuesta se descarta.
    let cancelled = false
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
      .then(
        ({ data }) => {
          // Supabase entrega el rol como texto: solo se acepta un valor conocido.
          const role = data?.role === 'admin' || data?.role === 'seller' ? data.role : null
          if (!cancelled) setRole(role)
        },
        // Si la consulta falla, el rol sigue en null: sin controles de administrador.
        () => {},
      )
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setHasError(true)
    else setUserId(data.session?.user.id ?? null)
  }

  if (isLoading) return null

  if (hasSession)
    return (
      <>
        <nav>
          <button type="button" onClick={() => setScreen('inventory')}>
            Inventario
          </button>
          {role === 'admin' && (
            <button type="button" onClick={() => setScreen('sellers')}>
              Vendedores
            </button>
          )}
        </nav>
        {screen === 'sellers' && role === 'admin' ? <Sellers /> : <Inventory role={role} />}
      </>
    )

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Correo
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit">Iniciar sesión</button>
      {hasError && <p role="alert">Correo o contraseña incorrectos.</p>}
    </form>
  )
}
