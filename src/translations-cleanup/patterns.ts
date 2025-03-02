export const translationPatterns  = [
    // Basic t() function call (already fixed)
    /(?:^|\W)(?:\$)?t\(['"]([^'"]+)['"]\)/g,

    // $t() with quotes and multi-line support
    /(?:^|\W)(?:\$)?t\(\s*['"]([^'"]+)['"]\s*(?:,[\s\S]*?)?\)/g,

    // Template literals with multi-line support
    /(?:^|\W)(?:\$)?t\(\s*`([^`]+)`\s*(?:,[\s\S]*?)?\)/g,

    // rt() and $rt support with multi-line
    /(?:^|\W)(?:\$)?rt\(\s*['"]([^'"]+)['"]\s*(?:,[\s\S]*?)?\)/g,
    /(?:^|\W)(?:\$)?rt\(\s*`([^`]+)`\s*(?:,[\s\S]*?)?\)/g,

    // tc() and $tc() with multi-line support
    /(?:^|\W)(?:\$)?tc\(\s*['"]([^'"]+)['"]\s*(?:,[\s\S]*?)?\)/g,
    /(?:^|\W)(?:\$)?tc\(\s*`([^`]+)`\s*(?:,[\s\S]*?)?\)/g,

    // Composition API usage with multi-line support
    /(?:^|\W)useI18n\(\)\.[tr]t\(\s*['"`]([^'"`]+)['"`]\s*(?:,[\s\S]*?)?\)/g,

    // Object-style template usage - this one is fine as is because it specifically looks for $t:
    /\$t\s*:\s*['"`]([^'"`]+)['"`]/g,

    // Handle bracket notation
    /(?:^|\W)(?:\$)?t\(['"]([^'"]+(?:\[['"][^'"]+['"]\])*)['"]\)/g,
]
