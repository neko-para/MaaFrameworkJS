import { AdbController } from '@maa/controller'
import { waitInited } from '@maa/opencv'
import fs from 'fs/promises'
import path from 'path'

import { MaaInstance } from '..'

async function main() {
  await waitInited()

  const ctrl = new AdbController(
    '/usr/local/bin/adb',
    '127.0.0.1:62001',
    'RawWithGZip',
    'adb'
  )
  const inst = new MaaInstance(
    ctrl.actions,
    path.resolve(process.cwd(), 'resource')
  )
  inst.loadJson(JSON.parse(await fs.readFile('resource/1.json', 'utf-8')))
  await inst.runTask('Awake')
}

main()
