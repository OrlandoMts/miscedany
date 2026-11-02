import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Inventory from '../Inventory'

const { select, order, insert, update, eq } = vi.hoisted(() => ({
  select: vi.fn(),
  order: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      // `select` es la fuente de datos de cada test; se puede esperar con o sin `.order()`.
      select: (...args: unknown[]) => ({
        order: (...orderArgs: unknown[]) => {
          order(...orderArgs)
          return select(...args)
        },
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          select(...args).then(resolve, reject),
      }),
      insert,
      update,
    }),
  },
}))

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

describe('Inventory', () => {
  beforeEach(() => {
    select.mockResolvedValue({ data: [], error: null })
    insert.mockResolvedValue({ error: null })
    // `eq` es la fuente del resultado del update; se puede esperar con o sin `.select()`.
    update.mockReturnValue({
      eq: (...args: unknown[]) => {
        const resultado = eq(...args)
        return {
          select: () => resultado,
          then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            resultado.then(resolve, reject),
        }
      },
    })
    eq.mockResolvedValue({ data: [{ id: 1 }], error: null })
  })

  it('con productos muestra nombre, precio y stock de cada uno', async () => {
    select.mockResolvedValue({
      data: [
        { id: 1, name: 'Camisa', price: 25, stock: 10 },
        { id: 2, name: 'Pantalón', price: 40, stock: 3 },
      ],
      error: null,
    })

    render(<Inventory role="admin" />)

    const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
    expect(camisa.getByRole('cell', { name: '25' })).toBeInTheDocument()
    expect(camisa.getByRole('cell', { name: '10' })).toBeInTheDocument()
    const pantalon = within(screen.getByRole('row', { name: /Pantalón/ }))
    expect(pantalon.getByRole('cell', { name: '40' })).toBeInTheDocument()
    expect(pantalon.getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(screen.queryByText('No hay productos todavía.')).not.toBeInTheDocument()
  })

  it('un vendedor ve la lista sin formulario, sin Editar y sin columna de acciones', async () => {
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
      error: null,
    })

    render(<Inventory role="seller" />)

    const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
    expect(camisa.getAllByRole('cell')).toHaveLength(3)
    expect(
      screen.getAllByRole('columnheader').map((encabezado) => encabezado.textContent),
    ).toEqual(['Nombre', 'Precio', 'Stock'])
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('sin rol no se muestran el formulario, ni Editar, ni la columna de acciones', async () => {
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
      error: null,
    })

    render(<Inventory role={null} />)

    const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
    expect(camisa.getAllByRole('cell')).toHaveLength(3)
    expect(
      screen.getAllByRole('columnheader').map((encabezado) => encabezado.textContent),
    ).toEqual(['Nombre', 'Precio', 'Stock'])
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar producto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('sin productos muestra el estado vacío del inventario', async () => {

    render(<Inventory role="admin" />)

    expect(
      await screen.findByRole('heading', { name: 'Inventario' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('No hay productos todavía.')).toBeInTheDocument()
  })

  it('pide la lista de productos ordenada por id', async () => {
    render(<Inventory role="admin" />)

    await screen.findByText('No hay productos todavía.')

    expect(order).toHaveBeenCalledWith('id')
  })

  describe('formulario de nuevo producto', () => {
    it.each(['', '   '])(
      'con nombre vacío o solo espacios (%j) muestra error y no guarda',
      async (nombre) => {
        render(<Inventory role="admin" />)
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
        render(<Inventory role="admin" />)
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
        render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(insert).toHaveBeenCalledWith({ name: 'Camisa', price: 25, stock: 10 })
    })

    it('guarda el nombre sin espacios al inicio ni al final', async () => {
      render(<Inventory role="admin" />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: '  Camisa de lino  ', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      expect(insert).toHaveBeenCalledWith({ name: 'Camisa de lino', price: 25, stock: 10 })
    })

    it('tras guardar, el producto aparece en la lista', async () => {
      listaDeProductos([], [{ id: 1, name: 'Camisa', price: 25, stock: 10 }])
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
      await screen.findByText('No hay productos todavía.')

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await screen.findByRole('alert')
      expect(screen.queryByRole('row', { name: /Camisa/ })).not.toBeInTheDocument()
      expect(screen.getByText('No hay productos todavía.')).toBeInTheDocument()
    })

    it('tras guardar con éxito limpia los campos', async () => {
      render(<Inventory role="admin" />)
      await screen.findByRole('heading', { name: 'Inventario' })

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveDisplayValue(''))
      expect(screen.getByLabelText('Precio')).toHaveDisplayValue('')
      expect(screen.getByLabelText('Stock')).toHaveDisplayValue('')
    })

    it('tras guardar con éxito no muestra el error anterior', async () => {
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
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
      render(<Inventory role="admin" />)
      await screen.findByText('No hay productos todavía.')

      await rellenarProducto({ nombre: 'Camisa', precio: '25', stock: '10' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

      await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveDisplayValue(''))
      expect(screen.getByLabelText('Precio')).toHaveDisplayValue('')
      expect(screen.getByLabelText('Stock')).toHaveDisplayValue('')

      terminarCarga({ data: [], error: null })
    })
  })

  describe('edición de producto', () => {
    it('al pulsar Editar, precio y stock de la fila pasan a campos con los valores actuales', async () => {
      select.mockResolvedValue({
        data: [
          { id: 1, name: 'Camisa', price: 25, stock: 10 },
          { id: 2, name: 'Pantalón', price: 40, stock: 3 },
        ],
        error: null,
      })
      render(<Inventory role="admin" />)

      const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(camisa.getByRole('button', { name: 'Editar' }))

      expect(camisa.getByRole('spinbutton', { name: 'Precio' })).toHaveValue(25)
      expect(camisa.getByRole('spinbutton', { name: 'Stock' })).toHaveValue(10)
      const pantalon = within(screen.getByRole('row', { name: /Pantalón/ }))
      expect(pantalon.queryByRole('spinbutton')).not.toBeInTheDocument()
    })

    it('al guardar con precio y stock nuevos, actualiza ese producto y muestra la lista recargada', async () => {
      listaDeProductos(
        [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
        [{ id: 1, name: 'Camisa', price: 30, stock: 7 }],
      )
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const precio = fila.getByRole('spinbutton', { name: 'Precio' })
      const stock = fila.getByRole('spinbutton', { name: 'Stock' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '30')
      await userEvent.clear(stock)
      await userEvent.type(stock, '7')
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      expect(update).toHaveBeenCalledWith({ price: 30, stock: 7 })
      expect(eq).toHaveBeenCalledWith('id', 1)
      const recargada = within(await screen.findByRole('row', { name: /Camisa/ }))
      await waitFor(() =>
        expect(recargada.queryByRole('spinbutton')).not.toBeInTheDocument(),
      )
      expect(recargada.getByRole('cell', { name: '30' })).toBeInTheDocument()
      expect(recargada.getByRole('cell', { name: '7' })).toBeInTheDocument()
    })

    it('si solo cambia el precio, update recibe solo el precio y no pisa el stock', async () => {
      select.mockResolvedValue({
        data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
        error: null,
      })
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const precio = fila.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '30')
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(update).toHaveBeenCalledWith({ price: 30 }))
    })

    it('si solo cambia el stock, update recibe solo el stock y no pisa el precio', async () => {
      select.mockResolvedValue({
        data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
        error: null,
      })
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const stock = fila.getByRole('spinbutton', { name: 'Stock' })
      await userEvent.clear(stock)
      await userEvent.type(stock, '7')
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(update).toHaveBeenCalledWith({ stock: 7 }))
    })

    it('si no cambia ningún campo, Guardar sale de edición sin actualizar el producto', async () => {
      select.mockResolvedValue({
        data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
        error: null,
      })
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      expect(fila.queryByRole('spinbutton')).not.toBeInTheDocument()
      expect(fila.getByRole('cell', { name: '25' })).toBeInTheDocument()
      expect(update).not.toHaveBeenCalled()
    })

    it('al pulsar Cancelar vuelve a la fila normal sin actualizar el producto', async () => {
      select.mockResolvedValue({
        data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
        error: null,
      })
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const precio = fila.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '99')
      await userEvent.click(fila.getByRole('button', { name: 'Cancelar' }))

      expect(fila.queryByRole('spinbutton')).not.toBeInTheDocument()
      expect(fila.getByRole('cell', { name: '25' })).toBeInTheDocument()
      expect(fila.getByRole('cell', { name: '10' })).toBeInTheDocument()
      expect(update).not.toHaveBeenCalled()
    })

    it('si el update funciona y la recarga de la lista falla, no dice que falló el guardado', async () => {
      select
        .mockResolvedValueOnce({
          data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
          error: null,
        })
        .mockRejectedValue(new Error('red'))
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const precio = fila.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '30')
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(select).toHaveBeenCalledTimes(2))
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('mientras guarda, deshabilita Guardar y los Editar, y un segundo clic no envía otro update', async () => {
      select.mockResolvedValue({
        data: [
          { id: 1, name: 'Camisa', price: 25, stock: 10 },
          { id: 2, name: 'Pantalón', price: 40, stock: 3 },
        ],
        error: null,
      })
      let terminar: (v: unknown) => void = () => {}
      eq.mockReturnValue(new Promise((resolve) => (terminar = resolve)))
      render(<Inventory role="admin" />)

      const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(camisa.getByRole('button', { name: 'Editar' }))
      const precio = camisa.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '30')
      const guardar = camisa.getByRole('button', { name: 'Guardar' })
      await userEvent.click(guardar)
      await userEvent.click(guardar)

      expect(guardar).toBeDisabled()
      const pantalon = within(screen.getByRole('row', { name: /Pantalón/ }))
      expect(pantalon.getByRole('button', { name: 'Editar' })).toBeDisabled()
      expect(update).toHaveBeenCalledTimes(1)

      await act(async () => terminar({ data: [{ id: 1 }], error: null }))
      await waitFor(() =>
        expect(
          within(screen.getByRole('row', { name: /Pantalón/ })).getByRole('button', {
            name: 'Editar',
          }),
        ).toBeEnabled(),
      )
    })

    it('tras guardar, la fila sigue en edición hasta que llega la lista recargada', async () => {
      let recargar: (v: unknown) => void = () => {}
      select
        .mockResolvedValueOnce({
          data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
          error: null,
        })
        .mockReturnValueOnce(new Promise((resolve) => (recargar = resolve)))
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const precio = fila.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '30')
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => expect(select).toHaveBeenCalledTimes(2))
      expect(fila.getByRole('spinbutton', { name: 'Precio' })).toBeInTheDocument()

      await act(async () =>
        recargar({
          data: [{ id: 1, name: 'Camisa', price: 30, stock: 10 }],
          error: null,
        }),
      )
      const recargada = within(await screen.findByRole('row', { name: /Camisa/ }))
      await waitFor(() =>
        expect(recargada.queryByRole('spinbutton')).not.toBeInTheDocument(),
      )
      expect(recargada.getByRole('cell', { name: '30' })).toBeInTheDocument()
    })

    it('el error de edición aparece dentro de la fila editada, no en el formulario', async () => {
      select.mockResolvedValue({
        data: [
          { id: 1, name: 'Camisa', price: 25, stock: 10 },
          { id: 2, name: 'Pantalón', price: 40, stock: 3 },
        ],
        error: null,
      })
      render(<Inventory role="admin" />)

      const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(camisa.getByRole('button', { name: 'Editar' }))
      const precio = camisa.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '0')
      await userEvent.click(camisa.getByRole('button', { name: 'Guardar' }))

      expect(await camisa.findByRole('alert')).toHaveTextContent(
        'El precio debe ser mayor que 0',
      )
      const formulario = within(screen.getByRole('button', { name: 'Guardar producto' }).closest('form')!)
      expect(formulario.queryByRole('alert')).not.toBeInTheDocument()
      const pantalon = within(screen.getByRole('row', { name: /Pantalón/ }))
      expect(pantalon.queryByRole('alert')).not.toBeInTheDocument()
    })

    it.each(['Cancelar', 'Editar otra fila'])(
      'el error de edición se limpia al pulsar %s',
      async (accion) => {
        select.mockResolvedValue({
          data: [
            { id: 1, name: 'Camisa', price: 25, stock: 10 },
            { id: 2, name: 'Pantalón', price: 40, stock: 3 },
          ],
          error: null,
        })
        render(<Inventory role="admin" />)

        const camisa = within(await screen.findByRole('row', { name: /Camisa/ }))
        await userEvent.click(camisa.getByRole('button', { name: 'Editar' }))
        const precio = camisa.getByRole('spinbutton', { name: 'Precio' })
        await userEvent.clear(precio)
        await userEvent.type(precio, '0')
        await userEvent.click(camisa.getByRole('button', { name: 'Guardar' }))
        expect(await camisa.findByRole('alert')).toBeInTheDocument()

        if (accion === 'Cancelar') {
          await userEvent.click(camisa.getByRole('button', { name: 'Cancelar' }))
        } else {
          const pantalon = within(screen.getByRole('row', { name: /Pantalón/ }))
          await userEvent.click(pantalon.getByRole('button', { name: 'Editar' }))
        }

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        if (accion === 'Cancelar') {
          await userEvent.click(camisa.getByRole('button', { name: 'Editar' }))
          expect(camisa.queryByRole('alert')).not.toBeInTheDocument()
        }
      },
    )

    it.each(['', '0', '-5'])(
      'al editar con precio vacío, 0 o negativo (%j) muestra error y no actualiza',
      async (valor) => {
        select.mockResolvedValue({
          data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
          error: null,
        })
        render(<Inventory role="admin" />)

        const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
        await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
        const precio = fila.getByRole('spinbutton', { name: 'Precio' })
        await userEvent.clear(precio)
        if (valor) await userEvent.type(precio, valor)
        await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'El precio debe ser mayor que 0',
        )
        expect(update).not.toHaveBeenCalled()
        expect(fila.getByRole('spinbutton', { name: 'Precio' })).toBeInTheDocument()
      },
    )

    it.each(['', '-1', '1.5'])(
      'al editar con stock vacío, negativo o decimal (%j) muestra error y no actualiza',
      async (valor) => {
        select.mockResolvedValue({
          data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
          error: null,
        })
        render(<Inventory role="admin" />)

        const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
        await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
        const stock = fila.getByRole('spinbutton', { name: 'Stock' })
        await userEvent.clear(stock)
        if (valor) await userEvent.type(stock, valor)
        await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'El stock debe ser un entero mayor o igual a 0',
        )
        expect(update).not.toHaveBeenCalled()
        expect(fila.getByRole('spinbutton', { name: 'Stock' })).toBeInTheDocument()
      },
    )

    it.each([
      ['devuelve error', () => eq.mockResolvedValue({ error: { message: 'rls' } })],
      ['lanza una excepción', () => eq.mockRejectedValue(new Error('red'))],
    ])(
      'si update %s muestra el error y la fila sigue en edición',
      async (_caso, fallar) => {
        select.mockResolvedValue({
          data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
          error: null,
        })
        fallar()
        render(<Inventory role="admin" />)

        const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
        await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
        const precio = fila.getByRole('spinbutton', { name: 'Precio' })
        await userEvent.clear(precio)
        await userEvent.type(precio, '30')
        await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'No se pudo guardar el producto',
        )
        expect(fila.getByRole('spinbutton', { name: 'Precio' })).toHaveValue(30)
      },
    )

    it('si update no afecta ninguna fila (por ejemplo, RLS) muestra el error y la fila sigue en edición', async () => {
      select.mockResolvedValue({
        data: [{ id: 1, name: 'Camisa', price: 25, stock: 10 }],
        error: null,
      })
      eq.mockResolvedValue({ data: [], error: null })
      render(<Inventory role="admin" />)

      const fila = within(await screen.findByRole('row', { name: /Camisa/ }))
      await userEvent.click(fila.getByRole('button', { name: 'Editar' }))
      const precio = fila.getByRole('spinbutton', { name: 'Precio' })
      await userEvent.clear(precio)
      await userEvent.type(precio, '30')
      await userEvent.click(fila.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo guardar el producto',
      )
      expect(fila.getByRole('spinbutton', { name: 'Precio' })).toHaveValue(30)
    })
  })
})
