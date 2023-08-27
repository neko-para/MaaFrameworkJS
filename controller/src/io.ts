import { spawn } from 'child_process'
import { AddressInfo, type Socket, createServer } from 'net'

export async function call_command(
  program: string,
  args: string[]
): Promise<Buffer | null> {
  const child = spawn(program, args, {
    stdio: ['ignore', 'pipe', 'inherit']
  })
  const output: Buffer[] = []
  child.stdout.on('data', (chunk: Buffer) => {
    output.push(chunk)
  })
  return new Promise(resolve => {
    child.on('close', code => {
      if (code !== 0) {
        resolve(null)
      } else {
        resolve(Buffer.concat(output))
      }
    })
  })
}

export async function call_command_socket(
  program: string,
  args: (port: number) => string[]
): Promise<null | Buffer> {
  const server = createServer()
  const port = await new Promise<number>(resolve => {
    server.listen(0, () => {
      resolve((server.address() as AddressInfo).port)
    })
  })
  const child = spawn(program, args(port), {
    stdio: ['ignore', 'ignore', 'inherit']
  })
  const socket = await new Promise<Socket>(resolve => {
    server.once('connection', socket => {
      resolve(socket)
    })
  })
  const output: Buffer[] = []
  socket.on('data', (chunk: Buffer) => {
    output.push(chunk)
  })
  socket.on('close', () => {
    server.close()
  })
  return new Promise(resolve => {
    socket.on('close', () => {
      const code = 0
      // child.on('close', code => {
      if (code !== 0) {
        resolve(null)
      } else {
        resolve(Buffer.concat(output))
      }
    })
  })
}
