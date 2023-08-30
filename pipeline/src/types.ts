import { Controller } from '@maa/controller'
import cv from '@nekosu/opencv-ts'

export type Rect = [x: number, y: number, width: number, height: number]
export type TextRepl = [from: string, to: string]

type DirectHit = {
  recognition?: 'DirectHit'
}

type TemplateMatch = {
  recognition: 'TemplateMatch'
  roi?: Rect | Rect[]
  template: string | string[]
  threshold?: number | number[]
  method?: 1 | 3 | 5
  green_mask?: boolean
}

type OCR = {
  recognition: 'OCR'
  roi?: Rect | Rect[]
  text: string | string[]
  replace?: TextRepl | TextRepl[]
  only_rec?: boolean
}

type DoNothing = {
  action?: 'DoNothing'
}

type Click = {
  action: 'Click'
  target?: true | string | Rect
  target_offset?: Rect
}

type Swipe = {
  action: 'Swipe'
  begin?: true | string | Rect
  begin_offset?: Rect
  end: true | string | Rect
  end_offset?: Rect
  duration?: number
}

type Key = {
  action: 'Key'
  key: number | number[]
}

type StartApp = {
  action: 'StartApp'
  package?: string
}

type StopApp = {
  action: 'StopApp'
  package?: string
}

type StopTask = {
  action: 'StopTask'
}

export type WaitFreezes = {
  time?: number
  target?: true | string | Rect
  target_offset?: Rect
  threshold?: number
  method?: 1 | 3 | 5
}

type Recognition = DirectHit | TemplateMatch | OCR
type Action = DoNothing | Click | Swipe | Key | StartApp | StopApp | StopTask

export type JsonTask = Recognition &
  Action & {
    next?: string | string[]
    is_sub?: boolean
    inverse?: boolean
    enabled?: boolean
    timeout?: number
    timeout_next?: string | string[]
    times_limit?: number
    runout_next?: string | string[]
    pre_delay?: number
    post_delay?: number
    pre_wait_freezes?: number | WaitFreezes
    post_wait_freezes?: number | WaitFreezes
    notify?: boolean
  }

export type Param = Record<string, unknown>
export interface Recognizer {
  recognize: (image: cv.Mat, ctrl: Controller, param?: Param) => Promise<null | Param>
}

export interface Actor {
  action: (ctrl: Controller, param?: Param) => Promise<null | Param>
}
