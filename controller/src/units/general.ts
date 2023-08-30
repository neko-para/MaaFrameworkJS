import { AdbController, ControllerData } from '..'

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
    async getUUID(this: ControllerData) {
      const res = await ctrl.shell('settings get secure android_id')
      const uuid = res?.trim() ?? null
      if (uuid) {
        this.uuid = uuid
      }
      return uuid
    },
    async getResolution(this: ControllerData) {
      const res = await ctrl.shell('dumpsys window displays | grep -o -E cur=+[^\\ ]+ | grep -o -E [0-9]+')
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
      const reso = resStr.map(x => parseInt(x)) as [number, number]
      this.resolution = {
        width: reso[0],
        height: reso[1]
      }
      if (this.size.width) {
        this.scale = this.size.width / reso[0]
      } else if (this.size.height) {
        this.scale = this.size.height / reso[1]
      }
      return reso
    },
    async getOrientation(this: ControllerData) {
      const res = await ctrl.shell('dumpsys input | grep SurfaceOrientation | grep -m 1 -o -E [0-9]')
      if (!res) {
        return null
      }
      const ori = parseInt(res.trim()) as 0 | 1 | 2 | 3
      if (ori < 0 || ori > 3) {
        return null
      }
      this.orientation = ori
      return ori
    }
  }
}
