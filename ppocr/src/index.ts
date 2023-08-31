import { fromPng, resize, toPng, waitInited } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor } from 'onnxruntime-node'

async function main() {
  await waitInited()

  const img = await fromPng(await fs.readFile('2.png'))
  if (!img) {
    return
  }
  const fimg = new cv.Mat()
  img.convertTo(fimg, cv.CV_32FC3, 1 / 255.0)
  img.delete()
  const height = fimg.rows
  const width = fimg.cols
  const pixs = width * height

  const c_hw = new cv.Mat(pixs, 4, cv.CV_32FC1)
  c_hw.data32F.set(fimg.data32F)
  const hw_c = new cv.Mat()
  cv.transpose(c_hw, hw_c)
  c_hw.delete()
  const transposeBasedData = hw_c.data32F.slice(pixs, pixs * 4)
  hw_c.delete()

  const ts = new Tensor('float32', transposeBasedData, [1, 3, height, width])
  const is = await InferenceSession.create(await fs.readFile('model/det.onnx'))
  const feeds: Record<string, Tensor> = {}
  feeds[is.inputNames[0]] = ts
  const outputs = await is.run(feeds)
  const output = outputs[is.outputNames[0]]
  const outputArray = output.data as Float32Array
  const outputMat = new cv.Mat(height, width, cv.CV_32FC1)
  outputMat.data32F.set(outputArray)
  const outBuf = await toPng(outputMat)
  if (!outBuf) {
    console.log('err!')
    return
  }
  await fs.writeFile('test.png', outBuf)
}

main()
