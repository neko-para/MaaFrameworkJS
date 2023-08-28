import cv from '@techstark/opencv-js'
import { readFileSync, writeFileSync } from 'fs'

import {
  AdbController,
  call_command,
  call_command_socket,
  decodeRaw,
  fromPng,
  toPng
} from '..'

// call_command_socket('E:/Programs/MAA/adb/platform-tools/adb.exe', port => {
//   return ['exec-out', `screencap | nc -w 3 10.0.2.2 ${port}`]
// }).then(async res => {
//   if (res) {
//     const mat = decodeRaw(res)
//     if (mat) {
//       const png = await toPng(mat)
//       if (png) {
//         writeFileSync('1.png', png)
//       }
//     }
//   } else {
//     console.log('failed!')
//   }
// })

async function main() {
  await new Promise<void>(resolve => {
    cv.onRuntimeInitialized = () => {
      resolve()
    }
  })

  const adb = new AdbController(
    '/usr/local/bin/adb',
    '127.0.0.1:62001',
    'Encode',
    'adb'
  )
  if (!(await adb.actions.connect())) {
    console.log('connect failed')
    return
  }
  console.log('UUID:', await adb.actions.getUUID())
  console.log('Resolution:', await adb.actions.getResolution())
  console.log('Orientation:', await adb.actions.getOrientation())
  const mat = await adb.actions.screencap()
  if (!mat) {
    console.log('screencap failed')
    return
  }
  await adb.actions.click(1, 1)
  writeFileSync('1.png', (await toPng(mat))!)
}

main()
