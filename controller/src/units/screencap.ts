import { decodeRaw, fromPng } from '@maa/opencv'
import zlib from 'zlib'

import { AdbController } from '..'

export function getRawByNetcat(ctrl: AdbController) {
  let cacheAddr: string | null = null
  return {
    screencap: async () => {
      if (!cacheAddr) {
        cacheAddr =
          (
            await ctrl.shell(
              'cat /proc/net/arp | awk -F " +" \'FNR == 2 {print $1}\''
            )
          )?.trim() ?? null
      }
      if (!cacheAddr) {
        return null
      }
      const buffer = await ctrl.shellSocket(
        port => `screencap | nc -w 3 ${cacheAddr} ${port}`
      )
      if (!buffer) {
        return null
      }
      return decodeRaw(buffer)
    }
  }
}

export function getRawWithGZip(ctrl: AdbController) {
  return {
    screencap: async () => {
      const buffer = await ctrl.execOut('screencap | gzip -1')
      if (!buffer) {
        return null
      }
      const decomp = await new Promise<null | Buffer>(resolve => {
        zlib.unzip(buffer, (err, result) => {
          if (err) {
            resolve(null)
          } else {
            resolve(result)
          }
        })
      })
      if (!decomp) {
        return null
      }
      return decodeRaw(decomp)
    }
  }
}

export function getEncode(ctrl: AdbController) {
  return {
    screencap: async () => {
      const buffer = await ctrl.execOut('screencap -p')
      if (!buffer) {
        return null
      }
      return fromPng(buffer)
    }
  }
}

// export function getEncodeToFile(ctrl: AdbController) {

// }

export type ScreencapType = 'RawByNetcat' | 'RawWithGZip' | 'Encode'

export function getScreencap(ctrl: AdbController, type: ScreencapType) {
  switch (type) {
    case 'RawByNetcat':
      return getRawByNetcat(ctrl)
    case 'RawWithGZip':
      return getRawWithGZip(ctrl)
    case 'Encode':
      return getEncode(ctrl)
  }
}
