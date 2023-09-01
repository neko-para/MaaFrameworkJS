import { boxPoints, fromPng, getCHW, paddingToAlign, resize, toPng, waitInited } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor } from 'onnxruntime-node'

import { PPOCRDetector } from './det'
import { PPOCRRecognizer } from './rec'

async function main() {
  await waitInited()

  const img = await fromPng(await fs.readFile('1.png'))
  if (!img) {
    return
  }
  const detector = await PPOCRDetector.create(await fs.readFile('model/det.onnx'))
  const recognizer = await PPOCRRecognizer.create(await fs.readFile('model/rec.onnx'))
  const keyMapper = (await fs.readFile('model/keys.txt', 'utf-8')).split('\n')
  const result = await detector.detect(img.clone())
  if (!result) {
    return
  }
  if (true) {
    const draw = img.clone()
    const mv = new cv.MatVector()
    for (const res of result) {
      const m = cv.matFromArray(res.length, 1, cv.CV_32SC2, res.flat(1))
      mv.push_back(m)
      m.delete()
    }
    cv.polylines(draw, mv, true, [255, 0, 0, 255])
    mv.delete()
    const outBuf = await toPng(draw)
    if (!outBuf) {
      console.log('err!')
      return
    }
    await fs.writeFile('test.png', outBuf)
    draw.delete()
  }
  for (const res of result) {
    // todo: allow rotated rect
    const xmin = Math.min(...res.map(x => x[0]))
    const xmax = Math.max(...res.map(x => x[0]))
    const ymin = Math.min(...res.map(x => x[1]))
    const ymax = Math.max(...res.map(x => x[1]))
    const part = img.roi({
      x: xmin,
      y: ymin,
      width: xmax - xmin + 1,
      height: ymax - ymin + 1
    })
    const recRes = await recognizer.recognize(part)
    if (!recRes) {
      return
    }
    console.log(recRes[0], recRes[1].map(x => keyMapper[x - 1]).join(''))
  }
  img.delete()
}

main()
