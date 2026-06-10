/**
 * pdf.js rejects Node Buffer even though Buffer extends Uint8Array.
 * @param {Buffer | Uint8Array | ArrayBuffer | ArrayLike<number>} data
 * @returns {Uint8Array}
 */
export function toPlainUint8Array(data) {
  if (Buffer.isBuffer(data)) {
    return Uint8Array.from(data);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data.slice(0));
  }
  if (data instanceof Uint8Array) {
    return Uint8Array.from(data);
  }
  return Uint8Array.from(/** @type {ArrayLike<number>} */ (data));
}
