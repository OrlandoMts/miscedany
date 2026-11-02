import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

const {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  select,
  insert,
  perfil,
  perfilEq,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  perfil: vi.fn(),
  perfilEq: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession,
      signInWithPassword,
      onAuthStateChange,
    },
    from: vi.fn((tabla: string) =>
      tabla === 'profiles'
        ? {
            // `perfil` es la fuente del perfil de cada test; `perfilEq` registra por qué usuario se pregunta.
            select: () => ({
              eq: (...args: unknown[]) => {
                perfilEq(...args)
                return { maybeSingle: perfil }
              },
            }),
          }
        : { select: () => ({ order: select }), insert },
    ),
  },
}))

const sesionActiva = { data: { session: { user: { id: 'admin-1' } } } }
const sesionDeVendedor = { data: { session: { user: { id: 'seller-1' } } } }
const sinSesion = { data: { session: null } }

describe('App', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sinSesion)
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    select.mockResolvedValue({ data: [], error: null })
    insert.mockResolvedValue({ error: null })
    perfil.mockResolvedValue({ data: { role: 'admin' }, error: null })
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

  it('un vendedor que inicia sesión ve la lista de productos con nombre, precio y stock', async () => {
    perfil.mockResolvedValue({ data: { role: 'seller' }, error: null })
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    signInWithPassword.mockResolvedValue({ ...sesionDeVendedor, error: null })
    render(<App />)

    await userEvent.type(await screen.findByLabelText('Correo'), 'vendedor@negocio.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-correcta')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const fila = (await screen.findByRole('cell', { name: 'Cuaderno' })).closest('tr')!
    expect(within(fila).getByRole('cell', { name: '25' })).toBeInTheDocument()
    expect(within(fila).getByRole('cell', { name: '10' })).toBeInTheDocument()
    // El rol sale del perfil del usuario que inició sesión.
    expect(perfilEq).toHaveBeenCalledWith('id', 'seller-1')
  })

  it('un vendedor no ve el formulario de alta, ni el botón Editar, ni la sección Vendedores', async () => {
    perfil.mockResolvedValue({ data: { role: 'seller' }, error: null })
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionDeVendedor)
    render(<App />)

    await screen.findByRole('cell', { name: 'Cuaderno' })

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vendedores' })).not.toBeInTheDocument()
  })

  it('un administrador ve el formulario de alta, el botón Editar y la sección Vendedores', async () => {
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)

    await screen.findByRole('cell', { name: 'Cuaderno' })

    expect(await screen.findByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vendedores' })).toBeInTheDocument()
  })

  it('si el perfil no se puede leer, no se muestra ningún control de administrador', async () => {
    perfil.mockResolvedValue({ data: null, error: { message: 'No se pudo leer el perfil' } })
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)

    await screen.findByRole('cell', { name: 'Cuaderno' })
    await waitFor(() => expect(perfil).toHaveBeenCalled())

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vendedores' })).not.toBeInTheDocument()
  })

  it('mientras carga el rol no se muestran controles de administrador', async () => {
    perfil.mockReturnValue(new Promise(() => {}))
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)

    await screen.findByRole('cell', { name: 'Cuaderno' })
    await waitFor(() => expect(perfil).toHaveBeenCalled())

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vendedores' })).not.toBeInTheDocument()
  })

  it('al cambiar de usuario no se conserva el rol del anterior', async () => {
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Vendedores' })).toBeInTheDocument()

    // Entra un vendedor y su perfil todavía no llega.
    perfil.mockReturnValue(new Promise(() => {}))
    const alCambiarSesion = onAuthStateChange.mock.calls[0][0]
    act(() => alCambiarSesion('SIGNED_IN', sesionDeVendedor.data.session))
    await waitFor(() => expect(perfilEq).toHaveBeenCalledWith('id', 'seller-1'))

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vendedores' })).not.toBeInTheDocument()
  })

  it('si un administrador deja la pantalla Vendedores y entra un vendedor, ve el inventario y no el formulario de vendedores', async () => {
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Vendedores' }))
    expect(screen.getByRole('heading', { name: 'Vendedores' })).toBeInTheDocument()

    // Entra un vendedor en el mismo navegador.
    perfil.mockResolvedValue({ data: { role: 'seller' }, error: null })
    const alCambiarSesion = onAuthStateChange.mock.calls[0][0]
    act(() => alCambiarSesion('SIGNED_IN', sesionDeVendedor.data.session))
    await waitFor(() => expect(perfilEq).toHaveBeenCalledWith('id', 'seller-1'))

    expect(await screen.findByRole('heading', { name: 'Inventario' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Vendedores' })).not.toBeInTheDocument()
  })

  it('una respuesta tardía del usuario anterior no pisa el rol del usuario actual', async () => {
    let responderAlAdministrador!: (respuesta: unknown) => void
    perfil
      .mockReturnValueOnce(new Promise((resolve) => (responderAlAdministrador = resolve)))
      .mockResolvedValueOnce({ data: { role: 'seller' }, error: null })
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)
    await waitFor(() => expect(perfilEq).toHaveBeenCalledWith('id', 'admin-1'))

    // Entra un vendedor mientras la consulta del administrador sigue en vuelo.
    const alCambiarSesion = onAuthStateChange.mock.calls[0][0]
    act(() => alCambiarSesion('SIGNED_IN', sesionDeVendedor.data.session))
    await waitFor(() => expect(perfilEq).toHaveBeenCalledWith('id', 'seller-1'))
    await screen.findByRole('cell', { name: 'Cuaderno' })

    // La respuesta del administrador llega tarde.
    await act(async () => responderAlAdministrador({ data: { role: 'admin' }, error: null }))

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vendedores' })).not.toBeInTheDocument()
  })

  it('si la consulta del perfil falla con una excepción, no se muestran controles de administrador', async () => {
    perfil.mockRejectedValue(new Error('Sin conexión'))
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Cuaderno', price: 25, stock: 10 }],
      error: null,
    })
    getSession.mockResolvedValue(sesionActiva)
    render(<App />)

    await screen.findByRole('cell', { name: 'Cuaderno' })
    await waitFor(() => expect(perfil).toHaveBeenCalled())

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vendedores' })).not.toBeInTheDocument()
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

    await userEvent.click(await screen.findByRole('button', { name: 'Vendedores' }))

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
