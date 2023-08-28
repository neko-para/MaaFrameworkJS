import { AdbController } from '..'

export function getConnection(ctrl: AdbController) {
  return {
    connect: async () => {
      const res = await ctrl.connect()
      return res && res.indexOf('failed') === -1
    },
    killServer: async () => {
      return !!(await ctrl.killServer())
    }
  }
}

export function getActivity(ctrl: AdbController) {
  return {
    startApp: async (intent: string, activity: string) => {
      const res = await ctrl.shell(`am start -n ${intent}/${activity}`)
      return res && res.indexOf('Error') === -1
    },
    stopApp: async (intent: string) => {
      return !!(await ctrl.shell(`am force-stop ${intent}`))
    }
  }
}

export function getDeviceInfo(ctrl: AdbController) {
  return {
    getUUID: async () => {
      const res = await ctrl.shell('settings get secure android_id')
      return res?.trim() ?? null
    },
    getResolution: async () => {
      const res = await ctrl.shell(
        'dumpsys window displays | grep -o -E cur=+[^\\ ]+ | grep -o -E [0-9]+'
      )
      if (!res) {
        return null
      }
      const resStr = res
        .trim()
        .split(/\n/)
        .map(x => x.trim())
      if (resStr.length !== 2) {
        return null
      }
      return resStr.map(x => parseInt(x)) as [number, number]
    },
    getOrientation: async () => {
      const res = await ctrl.shell(
        'dumpsys input | grep SurfaceOrientation | grep -m 1 -o -E [0-9]'
      )
      if (!res) {
        return null
      }
      const ori = parseInt(res.trim())
      if (ori < 0 || ori > 3) {
        return null
      }
      return ori as 0 | 1 | 2 | 3
    }
  }
}
