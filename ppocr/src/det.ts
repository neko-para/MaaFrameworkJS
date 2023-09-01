import { convertToFloat, fromPng, getCHW, paddingToAlign, resize, toPng, waitInited } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor } from 'onnxruntime-node'

export class PPOCRDetector {
  session: InferenceSession
  detectorMaskImage: cv.Mat

  static async create(model: Buffer): Promise<PPOCRDetector> {
    return new PPOCRDetector(await InferenceSession.create(model))
  }

  constructor(ss: InferenceSession) {
    this.session = ss
  }

  preprocess(takeInput: cv.Mat): [Tensor | null, number, number] {
    takeInput = paddingToAlign(takeInput, 32)
    const finput = convertToFloat(takeInput)
    if (!finput) {
      return [null, 0, 0]
    }
    const width = finput.cols
    const height = finput.rows
    const chw = getCHW(finput)
    const tensor = new Tensor('float32', chw, [1, 3, height, width])
    finput.delete()
    return [tensor, width, height]
  }

  postprocess(tensor: Tensor, width: number, height: number) {}

  async detect(input: cv.Mat) {
    const oldWidth = input.cols
    const oldHeight = input.rows

    const [inputTensor, width, height] = this.preprocess(input)
    if (!inputTensor) {
      return null
    }

    const inputFeeds: Record<string, Tensor> = {}
    inputFeeds[this.session.inputNames[0]] = inputTensor
    const outputFeeds = await this.session.run(inputFeeds)
    const output = outputFeeds[this.session.outputNames[0]]

    this.postprocess(output, width, height)

    this.detectorMaskImage = new cv.Mat(height, width, cv.CV_32FC1)
    this.detectorMaskImage.data32F.set(output.data as Float32Array)
    return output
  }
}
