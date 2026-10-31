import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

const { getSession, onAuthStateChange, signInWithPassword, select, insert } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession,
      signInWithPassword,
      onAuthStateChange,
    },
    from: vi.fn().mockReturnValue({ select: () => ({ order: select }), insert }),
  },
}))

const sesionActiva = { data: { session: { user: { id: 'admin-1' } } } }
const sinSesion = { data: { session: null } }

describe('App', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sinSesion)
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    select.mockResolvedValue({ data: [], error: null })
    insert.mockResolvedValue({ error: null })
  })

  it('sin sesión muestra el formulario de inicio de sesión', async () => {
    render(<App />)

    expect(await screen.findByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })

  it('mientras carga la sesión no muestra el formulario', async () => {
    getSession.mockReturnValue(new Promise(() => {}))

    render(<App />)

    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Inventario' }),
    ).not.toBeInTheDocument()
  })

  it('si la sesión termina vuelve al formulario de inicio de sesión', async () => {
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)
    await screen.findByRole('heading', { name: 'Inventario' })

    const alCambiarSesion = onAuthStateChange.mock.calls[0][0]
    act(() => alCambiarSesion('SIGNED_OUT', null))

    expect(await screen.findByLabelText('Correo')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Inventario' }),
    ).not.toBeInTheDocument()
  })

  it('sin sesión no muestra el inventario', async () => {
    render(<App />)

    await screen.findByLabelText('Correo')
    expect(
      screen.queryByRole('heading', { name: 'Inventario' }),
    ).not.toBeInTheDocument()
  })

  it('con credenciales correctas muestra el inventario', async () => {
    signInWithPassword.mockResolvedValue({ ...sesionActiva, error: null })
    render(<App />)

    await userEvent.type(await screen.findByLabelText('Correo'), 'admin@negocio.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-correcta')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(
      await screen.findByRole('heading', { name: 'Inventario' }),
    ).toBeInTheDocument()
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@negocio.com',
      password: 'clave-correcta',
    })
  })

  it('con credenciales incorrectas muestra un mensaje de error', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    render(<App />)

    await userEvent.type(await screen.findByLabelText('Correo'), 'admin@negocio.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-incorrecta')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos.',
    )
  })

  it('con credenciales incorrectas no muestra el inventario', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    render(<App />)

    await userEvent.type(await screen.findByLabelText('Correo'), 'admin@negocio.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-incorrecta')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await screen.findByRole('alert')
    expect(
      screen.queryByRole('heading', { name: 'Inventario' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
  })

  it('con sesión se puede pasar de Inventario a Vendedores y volver', async () => {
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)
    await screen.findByRole('heading', { name: 'Inventario' })

    await userEvent.click(screen.getByRole('button', { name: 'Vendedores' }))

    expect(screen.getByRole('heading', { name: 'Vendedores' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Inventario' }),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Inventario' }))

    expect(
      await screen.findByRole('heading', { name: 'Inventario' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Vendedores' }),
    ).not.toBeInTheDocument()
  })
})
