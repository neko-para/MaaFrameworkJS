import { type Controller } from '@maa/controller'
import { fromPng } from '@maa/opencv'
import cv from '@nekosu/opencv-ts'
import fs from 'fs/promises'
import path from 'path'

import { JsonTask, Rect, Task } from '.'

export class MaaInstance {
  ctrl: Controller
  tasks: Record<string, Task>
  root: string

  constructor(ctrl: Controller, root: string) {
    this.ctrl = ctrl
    this.tasks = {}
    this.root = root
  }

  loadJson(obj: Record<string, JsonTask>) {
    for (const name in obj) {
      if (name in this.tasks) {
        console.log('duplicate task', name)
        continue
      }
      this.tasks[name] = {
        type: 'json',
        task: obj[name]
      }
    }
  }

  async runTask(name: string) {
    const task = this.tasks[name]
    switch (task.type) {
      case 'json': {
        return await this.runJsonTask(task.task)
      }
    }
  }

  async runJsonTask(task: JsonTask) {
    const [got, roi] = await this.recognizeJsonTask(task)
    console.log(got, roi)
  }

  async recognizeJsonTask(task: JsonTask): Promise<[boolean, null | Rect]> {
    switch (task.recognition) {
      case 'DirectHit':
        return [true, null]
      case 'TemplateMatch': {
        const templs =
          task.template instanceof Array ? task.template : [task.template]
        const now_1920 = await this.ctrl.screencap()
        if (!now_1920) {
          return [false, null]
        }
        const now_1280 = new cv.Mat()
        cv.resize(now_1920, now_1280, new cv.Size(1280, 720))
        const now = now_1280
        for (const templ of templs) {
          const templPath = path.join(this.root, templ)
          const buffer = await fs.readFile(templPath)
          const templMat = await fromPng(buffer)
          if (!templMat) {
            continue
          }
          let targetRoi: Rect[] = [[0, 0, now.cols, now.rows]]
          if (task.roi && task.roi.length > 0) {
            const rois =
              task.roi[0] instanceof Array
                ? (task.roi as Rect[])
                : [task.roi as Rect]
            targetRoi = rois
          }
          for (const roi of targetRoi) {
            const res = new cv.Mat()
            const part = now.roi(new cv.Rect(roi[0], roi[1], roi[2], roi[3]))
            console.log(now.type(), part.type(), templMat.type())
            // return [false, null]
            cv.matchTemplate(
              part,
              templMat,
              res,
              task.method ?? cv.TM_CCOEFF_NORMED,
              new cv.Mat()
            )

            if (!res.empty()) {
              return [true, roi]
            }
          }
        }
        return [false, null]
      }
    }
    return [false, null]
  }

  async actionJsonTask(task: JsonTask, roi: Rect) {}
}
