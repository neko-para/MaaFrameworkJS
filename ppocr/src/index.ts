import { fromPng, resize, waitInited } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import { InferenceSession, Tensor, TensorConstructor } from 'onnxruntime-node'

async function main() {
  await waitInited()

  const img = await fromPng(await fs.readFile('1.png'))
  if (!img) {
    return
  }
  // const resized = resize(img, {
  //   height: 48
  // })
  // img.delete()
  const resized = img
  if (!resized) {
    return
  }
  const height = resized.rows
  const width = resized.cols
  const pixs = width * height
  let rs: number[] = []
  let gs: number[] = []
  let bs: number[] = []
  for (let i = 0; i < pixs; i++) {
    const r = resized.data[i * 4] / 255.0
    const g = resized.data[i * 4 + 1] / 255.0
    const b = resized.data[i * 4 + 2] / 255.0
    rs.push(r)
    gs.push(g)
    bs.push(b)
  }
  const arr = new Float32Array(width * height * 3)
  const data = [...rs, ...gs, ...bs]
  for (let i = 0; i < pixs * 3; i++) {
    arr[i] = data[i]
  }
  const ts = new Tensor('float32', arr, [1, 3, height, width])
  const is = await InferenceSession.create(await fs.readFile('model/det.onnx'))
  const feeds: Record<string, Tensor> = {}
  feeds[is.inputNames[0]] = ts
  const out = await is.run(feeds)
  console.log(out)
}

main()
