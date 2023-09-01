import { boxPoints, fromPng, getCHW, paddingToAlign, resize, toPng, waitInited } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor } from 'onnxruntime-node'

import { PPOCRDetector } from './det'
import { PPOCRRecognizer } from './rec'

export class PPOCR {
  detector: PPOCRDetector
  recognizer: PPOCRRecognizer

  static async create(det: string, rec: string, key: string) {
    const detector = await PPOCRDetector.create(await fs.readFile(det))
    const recognizer = await PPOCRRecognizer.create(
      await fs.readFile(rec),
      (await fs.readFile(key, 'utf-8')).split('\n')
    )
    return new PPOCR(detector, recognizer)
  }

  constructor(det: PPOCRDetector, rec: PPOCRRecognizer) {
    this.detector = det
    this.recognizer = rec
  }

  async det_rec(img: cv.Mat) {
    const result: [score: number, text: string][] = []
    const detRes = await this.detector.detect(img.clone())
    if (!detRes) {
      return []
    }
    // if (true) {
    //   const draw = img.clone()
    //   const mv = new cv.MatVector()
    //   for (const res of result) {
    //     const m = cv.matFromArray(res.length, 1, cv.CV_32SC2, res.flat(1))
    //     mv.push_back(m)
    //     m.delete()
    //   }
    //   cv.polylines(draw, mv, true, [255, 0, 0, 255])
    //   mv.delete()
    //   const outBuf = await toPng(draw)
    //   if (!outBuf) {
    //     console.log('err!')
    //     return
    //   }
    //   await fs.writeFile('test.png', outBuf)
    //   draw.delete()
    // }
    for (const res of detRes) {
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
      const recRes = await this.recognizer.recognize(part)
      if (!recRes) {
        return []
      }
      result.push([recRes[0], recRes[1]])
    }
    return result
  }

  async rec(takeImg: cv.Mat): Promise<[score: number, text: string][]> {
    const recRes = await this.recognizer.recognize(takeImg)
    if (!recRes) {
      return []
    }
    return [[recRes[0], recRes[1]]]
  }
}
