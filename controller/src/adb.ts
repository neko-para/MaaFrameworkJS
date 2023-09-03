import { ResizeSizing } from '@maa/opencv'

import { Controller, call_command, call_command_socket } from '..'
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
  actions: Controller

  constructor(adb: string, address: string, screencap: ScreencapType, input: InputType, size: ResizeSizing) {
    this.adb = adb
    this.addr = address
    this.actions = {
      size,
      scale: 1,
      ...getConnection(this),
      ...getActivity(this),
      ...getDeviceInfo(this),
      ...getScreencap(this, screencap),
      ...getInput(this, input)
    }
  }

  async init() {
    if (!(await this.actions.connect())) {
      return false
    }
    await this.actions.getUUID()
    await this.actions.getResolution()
    await this.actions.getOrientation()
  }

  async connect(): Promise<null | String> {
    return (await call_command(this.adb, ['connect', this.addr]))?.toString('utf-8') ?? null
  }

  async killServer(): Promise<null | String> {
    return (await call_command(this.adb, ['kill-server']))?.toString('utf-8') ?? null
  }

  async shell(cmd: string): Promise<null | string> {
    return (await call_command(this.adb, ['-s', this.addr, 'shell', cmd]))?.toString('utf-8') ?? null
  }

  async shellSocket(cmd: (port: number) => string): Promise<null | Buffer> {
    return call_command_socket(this.adb, port => ['-s', this.addr, 'shell', cmd(port)])
  }

  async execOut(cmd: string): Promise<null | Buffer> {
    return call_command(this.adb, ['-s', this.addr, 'exec-out', cmd])
  }

  async pushFile(from: string, to: string): Promise<null | string> {
    return (await call_command(this.adb, ['-s', this.addr, 'push', from, to]))?.toString('utf-8') ?? null
  }

  async pullFile(from: string, to: string): Promise<null | string> {
    return (await call_command(this.adb, ['-s', this.addr, 'pull', from, to]))?.toString('utf-8') ?? null
  }
}
