/**
 * Template — copy to backend/src/modules/<module>/adapters/parser.adapter.js
 * Contract: documentPersistence v001
 */

/**
 * @typedef {object} ParseResult
 * @property {string} versionType
 * @property {string} [textContent]
 * @property {unknown} [structuredJson]
 * @property {string} extractionMethod
 */

/**
 * @param {object} _options
 */
export function createParserAdapter(_options = {}) {
  /**
   * @param {object} input
   * @param {string} input.storagePath
   * @param {string} input.mimeType
   * @returns {Promise<ParseResult>}
   */
  async function parseDocument({ storagePath, mimeType }) {
    // TODO: wire pdf-parse, mammoth, or OpenRouter vision/reasoning models
    void storagePath;
    void mimeType;
    throw new Error("Parser adapter not implemented — see parser.adapter.template.js");
  }

  return { parseDocument };
}
