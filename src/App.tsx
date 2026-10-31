import { useEffect, useState, type SubmitEvent } from 'react'
import Inventory from './Inventory'
import Sellers from './Sellers'
import { supabase } from './supabaseClient'

export default function App() {
  const [hasSession, setHasSession] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)
  const [screen, setScreen] = useState<'inventory' | 'sellers'>('inventory')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setHasSession(!!session),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setHasError(true)
    else setHasSession(true)
  }

  if (isLoading) return null

  if (hasSession)
    return (
      <>
        <nav>
          <button type="button" onClick={() => setScreen('inventory')}>
            Inventario
          </button>
          <button type="button" onClick={() => setScreen('sellers')}>
            Vendedores
          </button>
        </nav>
        {screen === 'inventory' ? <Inventory /> : <Sellers />}
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
