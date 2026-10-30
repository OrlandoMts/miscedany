import { useEffect, useState, type SubmitEvent } from 'react'
import Inventory from './Inventory'
import { supabase } from './supabaseClient'

export default function App() {
  const [hasSession, setHasSession] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setHasError(true)
    else setHasSession(true)
  }

  if (hasSession) return <Inventory />

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Correo
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit">Iniciar sesión</button>
      {hasError && <p role="alert">Correo o contraseña incorrectos.</p>}
    </form>
  )
}
