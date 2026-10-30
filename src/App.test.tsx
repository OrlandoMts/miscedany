import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { getSession, onAuthStateChange, signInWithPassword, select, insert } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession,
      signInWithPassword,
      onAuthStateChange,
    },
    from: vi.fn().mockReturnValue({ select, insert }),
  },
}))

const sesionActiva = { data: { session: { user: { id: 'admin-1' } } } }
const sinSesion = { data: { session: null } }

type Producto = { id: number; name: string; price: number; stock: number }

// La primera carga devuelve `antes`; las siguientes (tras guardar) devuelven `despues`.
function listaDeProductos(antes: Producto[], despues: Producto[]) {
  select
    .mockResolvedValueOnce({ data: antes, error: null })
    .mockResolvedValue({ data: despues, error: null })
}

async function rellenarProducto({
  nombre = '',
  precio = '',
  stock = '',
}: {
  nombre?: string
  precio?: string
  stock?: string
}) {
  if (nombre) await userEvent.type(screen.getByLabelText('Nombre'), nombre)
  if (precio) await userEvent.type(screen.getByLabelText('Precio'), precio)
  if (stock) await userEvent.type(screen.getByLabelText('Stock'), stock)
}

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

  describe('formulario de nuevo producto', () => {
    beforeEach(() => {
      getSession.mockResolvedValue(sesionActiva)
    })

    it.each(['', '   '])(
      'con nombre vacío o solo espacios (%j) muestra error y no guarda',
      async (nombre) => {
        render(<App />)
        await screen.findByRole('heading', { name: 'Inventario' })

        await rellenarProducto({ nombre, precio: '25', stock: '10' })
        await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'El nombre es obligatorio',
        )
        expect(insert).not.toHaveBeenCalled()
      },
    )

    it.each(['', '0', '-5'])(
      'con precio vacío, 0 o negativo (%j) muestra error y no guarda',
      async (precio) => {
        render(<App />)
        await screen.findByRole('heading', { name: 'Inventario' })

        await rellenarProducto({ nombre: 'Camisa', precio, stock: '10' })
        await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'El precio debe ser mayor que 0',
        )
        expect(insert).not.toHaveBeenCalled()
      },
    )

    it.each(['', '-1', '1.5'])(
      'con stock vacío, negativo o decimal (%j) muestra error y no guarda',
      async (stock) => {
        render(<App />)
        await screen.findByRole('heading', { name: 'Inventario' })

        await rellenarProducto({ nombre: 'Camisa', precio: '25', stock })
        await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'El stock debe ser un entero mayor o igual a 0',
        )
        expect(insert).not.toHaveBeenCalled()
      },
    )

    it('con datos válidos guarda el producto con nombre, precio y stock', async () => {
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(insert).toHaveBeenCalledWith({ name: 'Camisa', price: 25, stock: 10 })
    })

    it('guarda el nombre sin espacios al inicio ni al final', async () => {
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: '  Camisa de lino  ', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(insert).toHaveBeenCalledWith({ name: 'Camisa de lino', price: 25, stock: 10 })
    })

    it('tras guardar, el producto aparece en la lista', async () => {
      listaDeProductos([], [{ id: 1, name: 'Camisa', price: 25, stock: 10 }])
      render(<App />)
      await screen.findByText('No hay productos todavía.')

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      expect(fila.getByRole('cell', { name: '25' })).toBeInTheDocument()
      expect(fila.getByRole('cell', { name: '10' })).toBeInTheDocument()
    })

    it('permite guardar un producto con un nombre que ya existe', async () => {
      const camisa = { id: 1, name: 'Camisa', price: 25, stock: 10 }
      listaDeProductos([camisa], [camisa, { id: 2, name: 'Camisa', price: 30, stock: 5 }])
      render(<App />)
      await screen.findByRole('row', { name: /Camisa/ })

      await rellenarProducto({ nombre: 'Camisa', precio: '30', stock: '5' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(insert).toHaveBeenCalledWith({ name: 'Camisa', price: 30, stock: 5 })
      await waitFor(() =>
        expect(screen.getAllByRole('row', { name: /Camisa/ })).toHaveLength(2),
      )
    })

    it('si el guardado falla muestra "No se pudo guardar el producto"', async () => {
      insert.mockResolvedValue({ error: { message: 'Failed to fetch' } })
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo guardar el producto',
      )
    })

    it('si el guardado falla el producto no aparece en la lista', async () => {
      insert.mockResolvedValue({ error: { message: 'Failed to fetch' } })
      listaDeProductos([], [{ id: 1, name: 'Camisa', price: 25, stock: 10 }])
      render(<App />)
      await screen.findByText('No hay productos todavía.')

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await screen.findByRole('alert')
      expect(screen.queryByRole('row', { name: /Camisa/ })).not.toBeInTheDocument()
      expect(screen.getByText('No hay productos todavía.')).toBeInTheDocument()
    })

    it('tras guardar con éxito limpia los campos', async () => {
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveDisplayValue(''))
      expect(screen.getByLabelText('Precio')).toHaveDisplayValue('')
      expect(screen.getByLabelText('Stock')).toHaveDisplayValue('')
    })

    it('tras guardar con éxito no muestra el error anterior', async () => {
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })
      await rellenarProducto({ nombre: 'Camisa', precio: '0', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))
      await screen.findByRole('alert')

      await userEvent.clear(screen.getByLabelText('Precio'))
      await userEvent.type(screen.getByLabelText('Precio'), '25')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    })

    it('mientras guarda deshabilita el botón', async () => {
      let terminarGuardado: (resultado: { error: null }) => void = () => {}
      insert.mockReturnValue(new Promise((resolve) => (terminarGuardado = resolve)))
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeDisabled()

      terminarGuardado({ error: null })
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeEnabled(),
      )
    })

    it('si el guardado falla conserva lo escrito y vuelve a habilitar el botón', async () => {
      insert.mockResolvedValue({ error: { message: 'Failed to fetch' } })
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await screen.findByRole('alert')
      expect(screen.getByLabelText('Nombre')).toHaveDisplayValue('Camisa')
      expect(screen.getByLabelText('Precio')).toHaveDisplayValue('25')
      expect(screen.getByLabelText('Stock')).toHaveDisplayValue('10')
      expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeEnabled()
    })

    it('si el insert lanza una excepción muestra el mensaje y vuelve a habilitar el botón', async () => {
      insert.mockRejectedValue(new Error('Failed to fetch'))
      render(<App />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo guardar el producto',
      )
      expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeEnabled()
    })

    it('limpia los campos aunque la lista aún esté cargando', async () => {
      let terminarCarga: (resultado: { data: never[]; error: null }) => void = () => {}
      select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockReturnValueOnce(new Promise((resolve) => (terminarCarga = resolve)))
      render(<App />)
      await screen.findByText('No hay productos todavía.')

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveDisplayValue(''))
      expect(screen.getByLabelText('Precio')).toHaveDisplayValue('')
      expect(screen.getByLabelText('Stock')).toHaveDisplayValue('')

      terminarCarga({ data: [], error: null })
    })
  })
})
