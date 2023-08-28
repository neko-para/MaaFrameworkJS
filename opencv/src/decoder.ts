import cv from '@nekosu/opencv-ts'

export function decodeRaw(buffer: Buffer) {
  if (buffer.length < 8) {
    return null
  }
  const width = buffer.readUint32LE(0)
  const height = buffer.readUint32LE(4)
  const size = 4 * width * height
  if (buffer.length < size) {
    return null
  }
  const header = buffer.length - size
  const data = Uint8Array.prototype.slice.call(buffer, header)
  const mat = cv.matFromArray(height, width, cv.CV_8UC4, data)
  if (mat.empty()) {
    return null
  }
  // cv.cvtColor(mat, mat, cv.COLOR_RGBA2RGB)
  return mat
}
