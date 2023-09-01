import { boxPoints, convertToFloat, fromPng, getCHW, paddingToAlign, resize, toPng, waitInited } from '@maa/opencv'
import cv, { RotatedRect } from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor } from 'onnxruntime-node'

const thresh = 0.3
const box_thresh = 0.6
const unclip_ratio = 1.5

function clamp(val: number, min: number, max: number) {
  if (val > max) {
    return max
  } else if (val < min) {
    return min
  } else {
    return val
  }
}
export class PPOCRRecognizer {
  session: InferenceSession

  static async create(model: Buffer): Promise<PPOCRRecognizer> {
    return new PPOCRRecognizer(await InferenceSession.create(model))
  }

  constructor(ss: InferenceSession) {
    this.session = ss
  }

  preprocess(takeInput: cv.Mat): Tensor | null {
    const input = resize(takeInput, {
      height: 48
    })
    takeInput.delete()
    if (!input) {
      return null
    }
    const finput = convertToFloat(input)
    if (!finput) {
      return null
    }
    const width = finput.cols
    const height = finput.rows
    const chw = getCHW(finput)
    const tensor = new Tensor('float32', chw, [1, 3, height, width])
    finput.delete()
    return tensor
  }

  postprocess(tensor: Tensor): [number, number[]] {
    const count = tensor.dims[1]
    const mat = new cv.Mat(count, 6625, cv.CV_32FC1)
    mat.data32F.set(tensor.data as Float32Array) // should only one batch
    const res: number[] = []
    let score = 0
    for (let i = 0; i < count; i++) {
      const row = mat.row(i)
      const { maxLoc, maxVal } = cv.minMaxLoc(row)
      if (maxLoc.x > 0) {
        score += maxVal
        res.push(maxLoc.x)
      }
    }
    score /= res.length + 1e-6
    return [score, res]
  }

  async recognize(input: cv.Mat) {
    const inputTensor = this.preprocess(input)
    if (!inputTensor) {
      return null
    }

    const inputFeeds: Record<string, Tensor> = {}
    inputFeeds[this.session.inputNames[0]] = inputTensor
    const outputFeeds = await this.session.run(inputFeeds)
    const output = outputFeeds[this.session.outputNames[0]]
    return this.postprocess(output)
  }
}
