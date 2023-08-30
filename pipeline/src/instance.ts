import { type Controller } from '@maa/controller'
import { fromPng } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import path from 'path'

import { Actor, JsonTask, Param, Recognizer, Rect } from '.'

const defaultThreshold = 0.7
const defaultTimeout = 20 * 1000

function matchForScore(image: cv.Mat, templ: cv.Mat): [success: boolean, score: number] {
  return [false, 0]
}

export class MaaInstance {
  ctrl: Controller
  root: string
  templCache: Record<string, null | cv.Mat>
  recs: Record<string, Recognizer>
  acts: Record<string, Actor>

  constructor(ctrl: Controller, root: string) {
    this.ctrl = ctrl
    this.root = root
    this.templCache = {}
    this.recs = {}
    this.acts = {}
  }

  async loadPng(img: string) {
    if (img in this.templCache) {
      return this.templCache[img]
    }
    const file = path.join(this.root, img)
    try {
      this.templCache[img] = await fromPng(await fs.readFile(file))
      return this.templCache[img]
    } catch (_err) {
      this.templCache[img] = null
      return null
    }
  }

  registerRecognizer(name: string, rec: Recognizer) {
    if (name in this.recs) {
      return false
    }
    this.recs[name] = rec
    return true
  }

  registerActor(name: string, act: Actor) {
    if (name in this.acts) {
      return false
    }
    this.acts[name] = act
    return true
  }

  async callRecognize(targets: string[], param?: Param): Promise<null | [string, Param]> {
    const img = await this.ctrl.screencap()
    if (!img) {
      return null
    }
    const img_1280 = new cv.Mat()
    cv.resize(img, img_1280, new cv.Size(1280, 720))
    img.delete()
    for (const target of targets) {
      if (!(target in this.recs)) {
        continue
      }
      const reco = this.recs[target]
      const res = await reco.recognize(img_1280, this.ctrl, param)
      if (res) {
        img_1280.delete()
        return [target, res]
      }
    }
    img_1280.delete()
    return null
  }

  async callAction(target: string, param?: Param): Promise<null | Param> {
    if (!(target in this.acts)) {
      return null
    }
    return this.acts[target].action(this.ctrl, param)
  }

  loadJson(name: string, task: JsonTask) {
    this.loadJsonReco(name, task)
  }

  loadJsonReco(name: string, task: JsonTask) {
    if (!task.recognition || task.recognition === 'DirectHit') {
      this.registerRecognizer(name, {
        recognize: async (image, ctrl, param) => {
          return {}
        }
      })
    } else if (task.recognition === 'TemplateMatch') {
      const templs = typeof task.template === 'string' ? [task.template] : task.template
      const thres = task.threshold
        ? task.threshold instanceof Array
          ? task.threshold
          : Array.from({ length: templs.length }, () => task.threshold as number)
        : Array.from({ length: templs.length }, () => defaultThreshold)
      const rois = task.roi
        ? task.roi.length === 0 || task.roi[0] instanceof Array
          ? (task.roi as Rect[])
          : Array.from({ length: templs.length }, () => task.roi as Rect)
        : null
      if (templs.length !== thres.length || (rois && templs.length !== rois.length)) {
        return false
      }
      this.registerRecognizer(name, {
        recognize: async (image, ctrl, param) => {
          for (const [idx, templ] of templs.entries()) {
            const templMat = await this.loadPng(templ)
            if (!templMat) {
              continue
            }
            const res = new cv.Mat()
            const part = rois ? image.roi(new cv.Rect(...rois[idx])) : image
            console.log(image.type(), part.type(), templMat.type())
            cv.matchTemplate(part, templMat, res, task.method ?? cv.TM_CCOEFF_NORMED, new cv.Mat())
            if (rois) {
              part.delete()
            }
            if (res.empty()) {
              continue
            }
            const { maxVal, maxLoc } = cv.minMaxLoc(res)
            if (isNaN(maxVal) || !isFinite(maxVal)) {
              continue
            }
            console.log(maxVal, maxLoc)
            if (maxVal >= thres[idx]) {
              const r = rois?.[idx] ?? [0, 0]
              return {
                roi: {
                  x: maxLoc.x + r[0],
                  y: maxLoc.y + r[1],
                  width: templMat.cols,
                  height: templMat.rows
                }
              }
            }
          }
          return null
        }
      })
    }
    return true
  }

  async runJsonTask(names: string[]) {
    const res = await this.callRecognize(names)
    if (!res) {
      return null
    }
    console.log(res)
    return await this.callAction(res[0], res[1])
  }
}
