import cv from '@nekosu/opencv-ts'
import Jimp from 'jimp'

export async function toPng(mat: cv.Mat): Promise<null | Buffer> {
  return new Promise(resolve => {
    new Jimp({
      width: mat.cols,
      height: mat.rows,
      data: Buffer.from(mat.data)
    }).getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      if (err) {
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
