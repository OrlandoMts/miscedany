import { useState, type SubmitEvent } from 'react'
import { supabase } from './supabaseClient'

// La función responde 409 con { error: 'email_exists' } cuando el correo ya existe.
// Cualquier otra respuesta (cuerpo ausente, no JSON, error de red) cuenta como fallo genérico.
async function isEmailTaken(error: unknown) {
  try {
    const body = await (error as { context?: Response }).context?.json()
    return body?.error === 'email_exists'
  } catch {
    return false
  }
}

export default function Sellers() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return setError('El nombre es obligatorio')
    if (name.trim().length > 100)
      return setError('El nombre no puede tener más de 100 caracteres')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('El correo no es válido')
    if (email.length > 254)
      return setError('El correo no puede tener más de 254 caracteres')
    if (password.length < 8)
      return setError('La contraseña debe tener al menos 8 caracteres')
    if (password.length > 72)
      return setError('La contraseña no puede tener más de 72 caracteres')
    setError('')
    setMessage('')
    setIsSaving(true)
    try {
      const { error: invokeError } = await supabase.functions.invoke('create-seller', {
        body: { name: name.trim(), email, password },
      })
      if (invokeError)
        return setError(
          (await isEmailTaken(invokeError))
            ? 'Ese correo ya está registrado'
            : 'No se pudo crear la cuenta',
        )
      setName('')
      setEmail('')
      setPassword('')
      setMessage('Cuenta de vendedor creada')
    } catch {
      setError('No se pudo crear la cuenta')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main>
      <h1>Vendedores</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Correo
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSaving}>
          Crear vendedor
        </button>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>
    </main>
  )
}
