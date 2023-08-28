import cv from '@nekosu/opencv-ts'

export * from './decoder'
export * from './format'

export async function waitInited() {
  if ('getBuildInformation' in cv) {
    return
  }
  return new Promise<void>(resolve => {
    cv.onRuntimeInitialized = () => {
      resolve()
    }
  })
}
