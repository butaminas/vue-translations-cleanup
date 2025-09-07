export const translationPatterns = [
  // t() / $t() with quotes and multi-line support — match only the first argument (stop before , or ))
  /(?:^|\W)\$?t\(\s*(['"])([\s\S]*?)\1(?=\s*[,)])/g,

  // Template literals with multi-line support — match only first arg
  /(?:^|\W)\$?t\(\s*`([^`]+)`(?=\s*[,)])/g,

  // rt() and $rt support — first arg only
  /(?:^|\W)\$?rt\(\s*(['"])([\s\S]*?)\1(?=\s*[,)])/g,
  /(?:^|\W)\$?rt\(\s*`([^`]+)`(?=\s*[,)])/g,

  // tc() and $tc() — first arg only
  /(?:^|\W)\$?tc\(\s*(['"])([\s\S]*?)\1(?=\s*[,)])/g,
  /(?:^|\W)\$?tc\(\s*`([^`]+)`(?=\s*[,)])/g,

  // Composition API usage — first arg only
  /(?:^|\W)useI18n\(\)\.(?:t|rt|tc)\(\s*(['"`])([\s\S]*?)\1(?=\s*[,)])/g,

  // Object-style template usage - specifically $t in object templates
  /\$t\s*:\s*(['"`])([\s\S]*?)\1/g,

  // Vue template directive v-t with inner quoted string inside attribute: v-t="'a.b'"
  /v-t\s*=\s*(["'])\s*(["'`])([^"'`]+)\2\s*\1/g,

  // Vue template directive v-t object form: v-t="{ path: 'a.b', ... }"
  /v-t\s*=\s*(["'])[^>]*?\bpath\s*:\s*(["'`])([^"'`]+)\2[^>]*?\1/g,

  // <i18n-t> component keypath static
  /<i18n-t\b[^>]*\skeypath\s*=\s*(["'`])([^"'`]+)\1/g,
  // <i18n-t> component keypath bound like :keypath="'a.b'"
  /<i18n-t\b[^>]*\s:keypath\s*=\s*(["'])\s*(["'`])([^"'`]+)\2\s*\1/g,

  // Also support legacy path attribute variants
  /<i18n-t\b[^>]*\spath\s*=\s*(["'`])([^"'`]+)\1/g,
  /<i18n-t\b[^>]*\s:path\s*=\s*(["'])\s*(["'`])([^"'`]+)\2\s*\1/g,
]
