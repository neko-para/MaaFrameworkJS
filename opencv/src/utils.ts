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

export function convertToFloat(takeMat: cv.Mat) {
  let type: number
  switch (takeMat.type()) {
    case cv.CV_8UC1:
      type = cv.CV_32FC1
      break
    case cv.CV_8UC2:
      type = cv.CV_32FC2
      break
    case cv.CV_8UC3:
      type = cv.CV_32FC3
      break
    case cv.CV_8UC4:
      type = cv.CV_32FC4
      break
    default:
      takeMat.delete()
      return null
  }
  const mat = new cv.Mat()
  takeMat.convertTo(mat, type, 1 / 255.0)
  takeMat.delete()
  return mat
}

export function paddingToAlign(takeMat: cv.Mat, alignWidth: number, alignHeight?: number) {
  if (!alignHeight) {
    alignHeight = alignWidth
  }
  const extraWidth = takeMat.cols % alignWidth
  const extraHeight = takeMat.rows % alignHeight
  if (extraWidth === 0 && extraHeight === 0) {
    return takeMat
  }
  const padWidth = extraWidth !== 0 ? alignWidth - extraWidth : 0
  const padHeight = extraHeight !== 0 ? alignHeight - extraHeight : 0
  const res = new cv.Mat()
  const pl = Math.floor(padWidth / 2)
  const pt = Math.floor(padHeight / 2)
  cv.copyMakeBorder(takeMat, res, pt, padHeight - pt, pl, padWidth - pl, cv.BORDER_REPLICATE)
  takeMat.delete()
  return res
}

/**
 * @param mat CV_32FC4
 */
export function getCHW(mat: cv.Mat) {
  const pixs = mat.rows * mat.cols
  const c_hw = new cv.Mat(pixs, 4, cv.CV_32FC1)
  c_hw.data32F.set(mat.data32F)
  const hw_c = new cv.Mat()
  cv.transpose(c_hw, hw_c)
  c_hw.delete()
  const result = hw_c.data32F.slice(0, pixs * 3)
  hw_c.delete()
  return result
}
