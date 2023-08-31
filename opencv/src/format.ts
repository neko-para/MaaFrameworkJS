import cv from '@nekosu/opencv-ts'
import Jimp from 'jimp'

export async function toPng(mat: cv.Mat, ow?: number, oh?: number, ot?: number): Promise<null | Buffer> {
  const w = ow ?? mat.cols
  const h = oh ?? mat.rows
  let data: Uint8Array
  switch (ot ?? mat.type()) {
    case cv.CV_8UC4:
      data = mat.data
      break
    case cv.CV_8UC3: {
      const md = mat.data
      data = new Uint8Array(w * h * 4)
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = md[i * 3]
        data[i * 4 + 1] = md[i * 3 + 1]
        data[i * 4 + 2] = md[i * 3 + 2]
        data[i * 4 + 3] = 255
      }
      break
    }
    case cv.CV_8UC1: {
      const md = mat.data
      data = new Uint8Array(w * h * 4)
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = md[i]
        data[i * 4 + 1] = md[i]
        data[i * 4 + 2] = md[i]
        data[i * 4 + 3] = 255
      }
      break
    }
    case cv.CV_32FC4: {
      const md = mat.data32F
      data = new Uint8Array(w * h * 4)
      for (let i = 0; i < w * h * 4; i++) {
        data[i] = md[i] * 255
      }
      break
    }
    case cv.CV_32FC3: {
      const md = mat.data32F
      data = new Uint8Array(w * h * 4)
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = md[i * 3]
        data[i * 4 + 1] = md[i * 3 + 1]
        data[i * 4 + 2] = md[i * 3 + 2]
        data[i * 4 + 3] = 255
      }
      break
    }
    case cv.CV_32FC1: {
      const md = mat.data32F
      data = new Uint8Array(w * h * 4)
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = md[i] * 255
        data[i * 4 + 1] = md[i] * 255
        data[i * 4 + 2] = md[i] * 255
        data[i * 4 + 3] = 255
      }
      break
    }

    default:
      console.log(ot ?? mat.type())
      return null
  }
  return new Promise(resolve => {
    new Jimp({
      width: w,
      height: h,
      data: Buffer.from(data)
    }).getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      if (err) {
        console.log(err)
        resolve(null)
      } else {
        resolve(buffer)
      }
    })
  })
}

export async function fromPng(png: Buffer): Promise<null | cv.Mat> {
  return new Promise(resolve => {
    Jimp.read(png, (err, jimp) => {
      if (err) {
        resolve(null)
      } else {
        const mat = cv.matFromImageData(jimp.bitmap)
        if (mat.empty()) {
          resolve(null)
        } else {
          resolve(mat)
        }
      }
    })
  })
}
