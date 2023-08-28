import { call_command, call_command_socket } from '..'
import {
  type InputType,
  type ScreencapType,
  getActivity,
  getConnection,
  getDeviceInfo,
  getInput,
  getScreencap
} from './units'

export class AdbController {
  adb: string
  addr: string
  actions: ReturnType<typeof getConnection> &
    ReturnType<typeof getActivity> &
    ReturnType<typeof getDeviceInfo> &
    ReturnType<typeof getScreencap> &
    ReturnType<typeof getInput>

  constructor(
    adb: string,
    address: string,
    screencap: ScreencapType,
    input: InputType
  ) {
    this.adb = adb
    this.addr = address
    this.actions = {
      ...getConnection(this),
      ...getActivity(this),
      ...getDeviceInfo(this),
      ...getScreencap(this, screencap),
      ...getInput(this, input)
    }
  }

  async connect(): Promise<null | String> {
    return (
      (await call_command(this.adb, ['connect', this.addr]))?.toString(
        'utf-8'
      ) ?? null
    )
  }

  async killServer(): Promise<null | String> {
    return (
      (await call_command(this.adb, ['kill-server']))?.toString('utf-8') ?? null
    )
  }

  async shell(cmd: string): Promise<null | string> {
    return (
      (await call_command(this.adb, ['-s', this.addr, 'shell', cmd]))?.toString(
        'utf-8'
      ) ?? null
    )
  }

  async shellSocket(cmd: (port: number) => string): Promise<null | Buffer> {
    return call_command_socket(this.adb, port => [
      '-s',
      this.addr,
      'shell',
      cmd(port)
    ])
  }

  async execOut(cmd: string): Promise<null | Buffer> {
    return call_command(this.adb, ['-s', this.addr, 'exec-out', cmd])
  }
}
