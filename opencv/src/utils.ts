import cv from '@nekosu/opencv-ts'

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

export type ResizeSizing = {
  width?: number
  height?: number
}

export function resize(mat: cv.Mat, size: ResizeSizing) {
  let rate = mat.cols / mat.rows // x / y
  let tsize: cv.Size
  if (size.width) {
    tsize = new cv.Size(size.width, size.width / rate)
  } else if (size.height) {
    tsize = new cv.Size(size.height * rate, size.height)
  } else {
    return null
  }
  const res = new cv.Mat()
  cv.resize(mat, res, tsize)
  return res
}
