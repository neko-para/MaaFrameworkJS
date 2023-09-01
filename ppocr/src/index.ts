import { fromPng, getCHW, paddingToAlign, resize, toPng, waitInited } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor } from 'onnxruntime-node'

import { PPOCRDetector } from './det'

async function main() {
  await waitInited()

  const img = await fromPng(await fs.readFile('1.png'))
  if (!img) {
    return
  }
  const detector = await PPOCRDetector.create(await fs.readFile('model/det.onnx'))
  const result = await detector.detect(img)
  if (!result) {
    return
  }
  const outBuf = await toPng(detector.detectorMaskImage)
  if (!outBuf) {
    console.log('err!')
    return
  }
  await fs.writeFile('test.png', outBuf)
}

main()
