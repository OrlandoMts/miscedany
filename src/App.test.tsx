import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { getSession, signInWithPassword, select } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  select: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession,
      signInWithPassword,
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({ select }),
  },
}))

const sesionActiva = { data: { session: { user: { id: 'admin-1' } } } }
const sinSesion = { data: { session: null } }

describe('App', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sinSesion)
    select.mockResolvedValue({ data: [], error: null })
  })

  it('sin sesión muestra el formulario de inicio de sesión', async () => {
    render(<App />)

    expect(await screen.findByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
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

  it('con sesión y productos muestra nombre, precio y stock de cada uno', async () => {
    getSession.mockResolvedValue(sesionActiva)
    select.mockResolvedValue({
      data: [
        { id: 1, name: 'Camisa', price: 25, stock: 10 },
        { id: 2, name: 'Pantalón', price: 40, stock: 3 },
      ],
      error: null,
    })

    render(<App />)

    const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
    expect(camisa.getByRole('cell', { name: '25' })).toBeInTheDocument()
    expect(camisa.getByRole('cell', { name: '10' })).toBeInTheDocument()
    const pantalon = within(screen.getByRole('row', { name: /Pantalón/ }))
    expect(pantalon.getByRole('cell', { name: '40' })).toBeInTheDocument()
    expect(pantalon.getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(screen.queryByText('No hay productos todavía.')).not.toBeInTheDocument()
  })

  it('con sesión y sin productos muestra el estado vacío del inventario', async () => {
    getSession.mockResolvedValue(sesionActiva)

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Inventario' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('No hay productos todavía.')).toBeInTheDocument()
  })
})
