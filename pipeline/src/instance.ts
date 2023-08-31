import { type Controller } from '@maa/controller'
import { fromPng } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import path from 'path'

import { Actor, JsonTask, Param, Recognizer, Rect } from '.'

const defaultThreshold = 0.7
const defaultTimeout = 20 * 1000

function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
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
    for (const target of targets) {
      if (!(target in this.recs)) {
        continue
      }
      const reco = this.recs[target]
      const res = await reco.recognize(img, this.ctrl, param)
      if (res) {
        img.delete()
        return [target, res]
      }
    }
    img.delete()
    return null
  }

  async callAction(target: string, param?: Param): Promise<null | Param> {
    if (!(target in this.acts)) {
      return null
    }
    return this.acts[target].action(this.ctrl, param)
  }

  loadJson(name: string, task: JsonTask) {
    this.loadJsonRec(name, task)
    this.loadJsonAct(name, task)
  }

  loadJsonRec(name: string, task: JsonTask) {
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
            let mask = cv.Mat.ones(part.size(), cv.CV_8UC1)
            if (task.green_mask) {
              const tempMat = new cv.Mat()
              cv.inRange(templMat, new cv.Scalar(0, 255, 0), new cv.Scalar(0, 255, 0), tempMat)
              cv.bitwise_not(tempMat, mask)
              tempMat.delete()
            }
            cv.matchTemplate(part, templMat, res, task.method ?? cv.TM_CCOEFF_NORMED, mask)
            mask.delete()
            if (rois) {
              part.delete()
            }
            if (res.empty()) {
              res.delete()
              continue
            }
            const { maxVal, maxLoc } = cv.minMaxLoc(res)
            res.delete()
            if (isNaN(maxVal) || !isFinite(maxVal)) {
              continue
            }
            console.log(maxVal, maxLoc)
            if (maxVal >= thres[idx]) {
              const r = rois?.[idx] ?? [0, 0]
              return {
                roi: [maxLoc.x + r[0], maxLoc.y + r[1], templMat.cols, templMat.rows]
              }
            }
          }
          return null
        }
      })
    }
    return true
  }

  loadJsonAct(name: string, task: JsonTask) {
    const pre_delay = task.pre_delay ?? 200
    const post_delay = task.post_delay ?? 500
    const doAct = (
      act: (ctrl: Controller, param?: Param) => Promise<null | ['next' | 'timeout_next' | 'runout_next', Param]>
    ) => {
      this.registerActor(name, {
        action: async (ctrl, param) => {
          await sleep(pre_delay)
          const nxt = await act(ctrl, param)
          if (!nxt) {
            return null
          }
          const res = this.navigateJson(task, nxt[0], nxt[1])
          await sleep(post_delay)
          return res
        }
      })
    }

    if (!task.action || task.action === 'DoNothing') {
      doAct(async () => null)
    } else if (task.action === 'Click') {
      const target = task.target ?? true
      if (target === true) {
        doAct(async (ctrl, param) => {
          if (!param?.roi) {
            return null
          }
          const roi = param.roi as Rect
          console.log(roi, roi[0] + roi[2] / 2, roi[1] + roi[3] / 2)
          await ctrl.click(roi[0] + roi[2] / 2, roi[1] + roi[3] / 2)
          return ['next', {}]
        })
      }
    }
  }

  async navigateJson(task: JsonTask, type: 'next' | 'timeout_next' | 'runout_next' = 'next', param: Param = {}) {
    const next = task[type]
    if (next) {
      return this.runTask(next instanceof Array ? next : [next], param)
    } else {
      return param
    }
  }

  async runTask(names: string[], param?: Param) {
    while (true) {
      const res = await this.callRecognize(names, param)
      if (res) {
        return await this.callAction(res[0], res[1])
      }
    }
  }
}
