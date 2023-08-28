import { AdbController } from '..'

export function getAdbClick(ctrl: AdbController) {
  return {
    click: async (x: number, y: number) => {
      return !!(await ctrl.shell(`input tap ${x} ${y}`))
    }
  }
}

export function getAdbSwipe(ctrl: AdbController) {
  let down: boolean = false
  let downX: number
  let downY: number
  return {
    swipeDown: async (x: number, y: number) => {
      down = true
      downX = x
      downY = y
      return true
    },
    swipeUp: async (x: number, y: number, dur: number) => {
      if (!down) {
        return
      }
      const ox = downX
      const oy = downY
      down = false
      return !!(await ctrl.shell(`input swipe ${ox} ${oy} ${x} ${y} ${dur}`))
    }
  }
}

export function getAdbKey(ctrl: AdbController) {
  return {
    key: async (key: number) => {
      return !!(await ctrl.shell(`input keyevent ${key}`))
    }
  }
}

export type InputType = 'adb'

export function getInput(ctrl: AdbController, type: InputType) {
  switch (type) {
    case 'adb':
      return {
        ...getAdbClick(ctrl),
        ...getAdbSwipe(ctrl),
        ...getAdbKey(ctrl)
      }
  }
}
