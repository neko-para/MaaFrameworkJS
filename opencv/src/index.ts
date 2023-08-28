import cv from '@techstark/opencv-js'

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
