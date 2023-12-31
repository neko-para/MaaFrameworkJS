import { AdbController } from '@maa/controller'
import { waitInited } from '@maa/opencv'
import { PPOCR } from '@maa/ppocr'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import path from 'path'

import { JsonTask, MaaInstance } from '..'

async function main() {
  await waitInited()

  const ctrl = new AdbController(
    '/usr/local/bin/adb',
    // 'E:/Programs/MAA/adb/platform-tools/adb.exe',
    '127.0.0.1:62001',
    // '127.0.0.1:16384',
    'RawWithGZip',
    'adb',
    {
      width: 1280
    }
  )
  await ctrl.init()
  console.log(ctrl.actions.scale)
  const inst = new MaaInstance(ctrl.actions, path.resolve(process.cwd(), 'resource'))
  inst.ppocr = await PPOCR.create('ppocr/model/det.onnx', 'ppocr/model/rec.onnx', 'ppocr/model/keys.txt')
  const data = JSON.parse(await fs.readFile('resource/1.json', 'utf-8')) as Record<string, JsonTask>
  for (const name in data) {
    inst.loadJson(name, data[name])
  }
  await inst.runTask(['GameStart'])
}

main().catch(err => {
  const { code, msg } = cv.exceptionFromPtr(err as number)
  console.log(msg)
  process.exit(code)
})
