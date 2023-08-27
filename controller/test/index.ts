import {
  call_command,
  call_command_socket,
  decodeRaw,
  fromPng,
  toPng
} from '..'
import cv from '@techstark/opencv-js'
import { readFileSync, writeFileSync } from 'fs'

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
  writeFileSync(
    '2.png',
    (await toPng((await fromPng(readFileSync('1.png')))!))!
  )
}

main()
