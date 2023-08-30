import { ResizeSizing } from '@maa/opencv'

import { getActivity, getConnection, getDeviceInfo, getInput, getScreencap } from './units'

export type ControllerData = {
  size: ResizeSizing
  /**
   * device * scale = set
   */
  scale: number
  uuid?: string
  resolution?: {
    width: number
    height: number
  }
  orientation?: 0 | 1 | 2 | 3
}

export type Controller = ControllerData &
  ReturnType<typeof getConnection> &
  ReturnType<typeof getActivity> &
  ReturnType<typeof getDeviceInfo> &
  ReturnType<typeof getScreencap> &
  ReturnType<typeof getInput>
