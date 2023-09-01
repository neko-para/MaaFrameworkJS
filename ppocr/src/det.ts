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
export class PPOCRDetector {
  session: InferenceSession

  static async create(model: Buffer): Promise<PPOCRDetector> {
    return new PPOCRDetector(await InferenceSession.create(model))
  }

  constructor(ss: InferenceSession) {
    this.session = ss
  }

  getMiniBoxes(box: RotatedRect): [number, [number, number][]] {
    const ssid = Math.max(box.size.width, box.size.height)
    const pts = boxPoints(box).sort((a, b) => a[0] - b[0])
    let idx1: [number, number]
    let idx2: [number, number]
    let idx3: [number, number]
    let idx4: [number, number]
    if (pts[3][1] <= pts[2][1]) {
      idx2 = pts[3]
      idx3 = pts[2]
    } else {
      idx2 = pts[2]
      idx3 = pts[3]
    }
    if (pts[1][1] <= pts[0][1]) {
      idx1 = pts[1]
      idx4 = pts[0]
    } else {
      idx1 = pts[0]
      idx4 = pts[1]
    }
    return [ssid, [idx1, idx2, idx3, idx4]]
  }

  polygonScoreAcc(con: cv.Mat, pred: cv.Mat) {
    const width = pred.cols
    const height = pred.rows
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < con.rows; i++) {
      xs.push(con.data32S[i * 2])
      ys.push(con.data32S[i * 2 + 1])
    }

    const xmin = clamp(Math.floor(Math.min(...xs)), 0, width - 1)
    const xmax = clamp(Math.ceil(Math.max(...xs)), 0, width - 1)
    const ymin = clamp(Math.floor(Math.min(...ys)), 0, height - 1)
    const ymax = clamp(Math.ceil(Math.max(...ys)), 0, height - 1)

    const mask = cv.Mat.zeros(ymax - ymin + 1, xmax - xmin + 1, cv.CV_8UC1)
    const rooks = new Int32Array(con.rows * 2)
    for (let i = 0; i < con.rows; i++) {
      rooks[i * 2] = Math.floor(xs[i]) - xmin
      rooks[i * 2 + 1] = Math.floor(ys[i]) - ymin
    }
    const rookMat = new cv.Mat(con.rows, 1, cv.CV_32SC2)
    rookMat.data32S.set(rooks)
    const mv = new cv.MatVector()
    mv.push_back(rookMat)
    cv.fillPoly(mask, mv, new cv.Scalar(1))
    rookMat.delete()
    mv.delete()
    const predRoi = pred.roi({
      x: xmin,
      y: ymin,
      width: xmax - xmin + 1,
      height: ymax - ymin + 1
    })
    const score = cv.mean(predRoi, mask)[0]
    return score
  }

  boxFromBitmap(pred: cv.Mat, bitmap: cv.Mat) {
    const contours = new cv.MatVector() // 32SC2
    const hierarchy = new cv.Mat() // 32SC4
    cv.findContours(bitmap, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
    const contoursCount = contours.size() > 1000 ? 1000 : contours.size()
    const boxes: [number, number][][] = []
    for (let i = 0; i < contoursCount; i++) {
      const contour = contours.get(i)
      if (contour.rows < 2) {
        contour.delete()
        continue
      }
      const box = cv.minAreaRect(contour)

      const [ssid] = this.getMiniBoxes(box)
      if (ssid < 3) {
        contour.delete()
        continue
      }
      const score = this.polygonScoreAcc(contour, pred)
      contour.delete()
      if (score < box_thresh) {
        continue
      }

      // TODO: fast deploy的这里有一个unclip操作, 不知道在干什么, 查到的应该是扩大unclip_ratio, 这里直接选择扩大arr了
      console.log(box.size.height)
      const [newssid, arr] = this.getMiniBoxes(
        new cv.RotatedRect(
          box.center,
          {
            width: box.size.width * unclip_ratio + 24,
            height: box.size.height * unclip_ratio + 24
          },
          box.angle
        )
      )
      if (newssid < 3 + 2) {
        continue
      }
      boxes.push(
        arr.map(pt => {
          return [
            clamp((pt[0] / bitmap.cols) * pred.cols, 0, pred.cols),
            clamp((pt[1] / bitmap.rows) * pred.rows, 0, pred.rows)
          ]
        })
      )
    }
    return boxes
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

  postprocess(tensor: Tensor, width: number, height: number, xoff: number, ow: number, yoff: number, oh: number) {
    if (tensor.type !== 'float32') {
      throw '???'
    }
    const cbuf = new cv.Mat(height, width, cv.CV_8UC1)
    const pred = new cv.Mat(height, width, cv.CV_32FC1)
    pred.data32F.set(tensor.data as Float32Array)
    toPng(pred).then(buf => {
      fs.writeFile('t.png', buf!)
    })
    pred.convertTo(cbuf, cv.CV_8UC1, 255.0)
    const bitmap = new cv.Mat()
    cv.threshold(cbuf, bitmap, thresh * 255, 255, cv.THRESH_BINARY)

    return this.boxFromBitmap(pred, bitmap).map(arr =>
      arr.map((pt: [number, number]): [number, number] => {
        return [clamp(Math.round(pt[0] - xoff), 0, ow), clamp(Math.round(pt[1] - yoff), 0, oh)]
      })
    )
  }

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

    return this.postprocess(
      output,
      width,
      height,
      Math.floor((width - oldWidth) / 2),
      oldWidth,
      Math.floor((height - oldHeight) / 2),
      oldHeight
    )
  }
}
