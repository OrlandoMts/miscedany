import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sellers from '../Sellers'

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    functions: { invoke },
  },
}))

async function rellenarVendedor({
  nombre = '',
  correo = '',
  contrasena = '',
}: {
  nombre?: string
  correo?: string
  contrasena?: string
}) {
  if (nombre) await userEvent.type(screen.getByLabelText('Nombre'), nombre)
  if (correo) await userEvent.type(screen.getByLabelText('Correo'), correo)
  if (contrasena) await userEvent.type(screen.getByLabelText('Contraseña'), contrasena)
}

describe('Sellers', () => {
  beforeEach(() => {
    invoke.mockReset()
    invoke.mockResolvedValue({ data: { id: 'vendedor-1' }, error: null })
  })

  it('con datos válidos llama a la función con nombre, correo y contraseña', async () => {
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'Ana',
      correo: 'ana@negocio.com',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(invoke).toHaveBeenCalledWith('create-seller', {
      body: { name: 'Ana', email: 'ana@negocio.com', password: 'clave123' },
    })
  })

  it('envía el nombre sin espacios al inicio ni al final', async () => {
    render(<Sellers />)

    await rellenarVendedor({
      nombre: '  Ana Pérez  ',
      correo: 'ana@negocio.com',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(invoke).toHaveBeenCalledWith('create-seller', {
      body: { name: 'Ana Pérez', email: 'ana@negocio.com', password: 'clave123' },
    })
  })

  it('tras crear la cuenta muestra la confirmación y limpia los campos', async () => {
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'Ana',
      correo: 'ana@negocio.com',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cuenta de vendedor creada',
    )
    expect(screen.getByLabelText('Nombre')).toHaveDisplayValue('')
    expect(screen.getByLabelText('Correo')).toHaveDisplayValue('')
    expect(screen.getByLabelText('Contraseña')).toHaveDisplayValue('')
  })

  it.each(['', '   '])(
    'con nombre vacío o solo espacios (%j) muestra error y no llama a la función',
    async (nombre) => {
      render(<Sellers />)

      await rellenarVendedor({
        nombre,
        correo: 'ana@negocio.com',
        contrasena: 'clave123',
      })
      await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'El nombre es obligatorio',
      )
      expect(invoke).not.toHaveBeenCalled()
    },
  )

  it('con nombre de más de 100 caracteres muestra error y no llama a la función', async () => {
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'a'.repeat(101),
      correo: 'ana@negocio.com',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El nombre no puede tener más de 100 caracteres',
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it.each(['', 'ana', 'ana@negocio', 'ana @negocio.com'])(
    'con correo inválido (%j) muestra error y no llama a la función',
    async (correo) => {
      render(<Sellers />)

      await rellenarVendedor({ nombre: 'Ana', correo, contrasena: 'clave123' })
      await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'El correo no es válido',
      )
      expect(invoke).not.toHaveBeenCalled()
    },
  )

  it('con correo de más de 254 caracteres muestra error y no llama a la función', async () => {
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'Ana',
      correo: 'a'.repeat(250) + '@b.co',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo no puede tener más de 254 caracteres',
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it.each(['', '1234567'])(
    'con contraseña de menos de 8 caracteres (%j) muestra error y no llama a la función',
    async (contrasena) => {
      render(<Sellers />)

      await rellenarVendedor({
        nombre: 'Ana',
        correo: 'ana@negocio.com',
        contrasena,
      })
      await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'La contraseña debe tener al menos 8 caracteres',
      )
      expect(invoke).not.toHaveBeenCalled()
    },
  )

  it('con contraseña de más de 72 caracteres muestra error y no llama a la función', async () => {
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'Ana',
      correo: 'ana@negocio.com',
      contrasena: 'a'.repeat(73),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña no puede tener más de 72 caracteres',
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it('si el correo ya está registrado muestra ese error y no confirma', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        name: 'FunctionsHttpError',
        context: new Response(JSON.stringify({ error: 'email_exists' }), { status: 409 }),
      }),
    })
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'Ana',
      correo: 'ana@negocio.com',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese correo ya está registrado',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  const falloHttp = (cuerpo: string, status: number) => ({
    data: null,
    error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      name: 'FunctionsHttpError',
      context: new Response(cuerpo, { status }),
    }),
  })

  it.each([
    [
      'un error del servidor con otro código',
      () => invoke.mockResolvedValue(falloHttp(JSON.stringify({ error: 'otro' }), 500)),
    ],
    [
      'un error del servidor con cuerpo que no es JSON',
      () => invoke.mockResolvedValue(falloHttp('<html>Bad Gateway</html>', 502)),
    ],
    [
      'un error de red sin respuesta',
      () =>
        invoke.mockResolvedValue({
          data: null,
          error: Object.assign(new Error('Failed to send a request to the Edge Function'), {
            name: 'FunctionsFetchError',
            context: new TypeError('Failed to fetch'),
          }),
        }),
    ],
    ['una excepción al invocar la función', () => invoke.mockRejectedValue(new Error('boom'))],
  ])(
    'con %s muestra "No se pudo crear la cuenta" y conserva lo escrito',
    async (_caso, simularFallo) => {
      simularFallo()
      render(<Sellers />)

      await rellenarVendedor({
        nombre: 'Ana',
        correo: 'ana@negocio.com',
        contrasena: 'clave123',
      })
      await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo crear la cuenta',
      )
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Nombre')).toHaveDisplayValue('Ana')
      expect(screen.getByLabelText('Correo')).toHaveDisplayValue('ana@negocio.com')
      expect(screen.getByLabelText('Contraseña')).toHaveDisplayValue('clave123')
    },
  )

  it('mientras guarda deshabilita el botón', async () => {
    let terminarGuardado: (resultado: { data: object; error: null }) => void = () => {}
    invoke.mockReturnValue(new Promise((resolve) => (terminarGuardado = resolve)))
    render(<Sellers />)

    await rellenarVendedor({
      nombre: 'Ana',
      correo: 'ana@negocio.com',
      contrasena: 'clave123',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(screen.getByRole('button', { name: 'Crear vendedor' })).toBeDisabled()

    terminarGuardado({ data: {}, error: null })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Crear vendedor' })).toBeEnabled(),
    )
  })

  it('tras crear la cuenta con éxito no muestra el error anterior', async () => {
    render(<Sellers />)
    await rellenarVendedor({ nombre: 'Ana', correo: 'ana@negocio.com', contrasena: '1234' })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))
    await screen.findByRole('alert')

    await userEvent.type(screen.getByLabelText('Contraseña'), '5678')
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cuenta de vendedor creada',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('tras un envío que falla no muestra la confirmación anterior', async () => {
    invoke
      .mockResolvedValueOnce({ data: { id: 'vendedor-1' }, error: null })
      .mockRejectedValueOnce(new Error('boom'))
    render(<Sellers />)
    await rellenarVendedor({ nombre: 'Ana', correo: 'ana@negocio.com', contrasena: 'clave123' })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))
    await screen.findByRole('status')

    await rellenarVendedor({ nombre: 'Luis', correo: 'luis@negocio.com', contrasena: 'clave456' })
    await userEvent.click(screen.getByRole('button', { name: 'Crear vendedor' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo crear la cuenta',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
