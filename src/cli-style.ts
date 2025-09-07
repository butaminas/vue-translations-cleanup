import kleur from 'kleur'

export const c = {
  dim: (s: string) => kleur.gray(s),
  info: (s: string) => kleur.cyan(s),
  warn: (s: string) => kleur.yellow(s),
  error: (s: string) => kleur.red(s),
  success: (s: string) => kleur.green(s),
  strong: (s: string) => kleur.bold(s),
}

export const symbols = {
  info: 'ℹ',
  warn: '⚠',
  error: '✖',
  success: '✔',
  bullet: '•',
}

export function separator(label?: string) {
  const line = '─'.repeat(40)
  if (!label)
    return c.dim(line)
  const l = ` ${label} `
  const half = Math.max(2, Math.floor((40 - l.length) / 2))
  return c.dim('─'.repeat(half) + l + '─'.repeat(half))
}
