import {
  getActivity,
  getConnection,
  getDeviceInfo,
  getInput,
  getScreencap
} from './units'

export type Controller = ReturnType<typeof getConnection> &
  ReturnType<typeof getActivity> &
  ReturnType<typeof getDeviceInfo> &
  ReturnType<typeof getScreencap> &
  ReturnType<typeof getInput>
