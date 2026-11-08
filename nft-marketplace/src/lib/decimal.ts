// ETH trafega como string decimal; cálculos em BigInt (18 casas) para não perder precisão.
const U = 10n ** 18n

export const toWei = (s: string): bigint => {
  const neg = s.startsWith('-')
  const [i = '0', f = ''] = (neg ? s.slice(1) : s).split('.')
  const w = BigInt(i || '0') * U + BigInt((f + '0'.repeat(18)).slice(0, 18))
  return neg ? -w : w
}
export const fromWei = (w: bigint): string => {
  const neg = w < 0n
  const a = neg ? -w : w
  const frac = (a % U).toString().padStart(18, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${a / U}${frac ? '.' + frac : ''}`
}
export const addEth = (a: string, b: string) => fromWei(toWei(a) + toWei(b))
export const subEth = (a: string, b: string) => fromWei(toWei(a) - toWei(b))
export const mulInt = (a: string, n: number) => fromWei(toWei(a) * BigInt(n))
/** percentual em pontos-base (1000 = 10%) */
export const pctBps = (a: string, bps: number) => fromWei((toWei(a) * BigInt(bps)) / 10000n)
export const fmtEth = (s: string, max = 4) => {
  const [i, f = ''] = s.split('.')
  const cut = f.slice(0, max).replace(/0+$/, '')
  return `${i}${cut ? ',' + cut : ''} ETH`
}
