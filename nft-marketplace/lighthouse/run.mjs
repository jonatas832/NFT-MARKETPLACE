// Uso: npm run build && (npm run preview &) && npm run lighthouse
import lighthouse from 'lighthouse'
import desktop from 'lighthouse/core/config/desktop-config.js'
import { launch } from 'chrome-launcher'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const PAGES = { home: '/', detail: '/nft/nft-3' }
const CATS = ['performance', 'accessibility', 'best-practices', 'seo']
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
mkdirSync('lighthouse/reports', { recursive: true })
const summary = {}

for (const [name, path] of Object.entries(PAGES)) for (const profile of ['mobile', 'desktop']) {
  const runs = []
  for (let i = 1; i <= 3; i++) {
    const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
    const r = await lighthouse(BASE + path, { port: chrome.port, output: ['html', 'json'], onlyCategories: CATS, logLevel: 'error' }, profile === 'desktop' ? desktop : undefined)
    await chrome.kill()
    writeFileSync(`lighthouse/reports/${name}-${profile}-${i}.html`, r.report[0])
    writeFileSync(`lighthouse/reports/${name}-${profile}-${i}.json`, r.report[1])
    const L = r.lhr
    runs.push({ ...Object.fromEntries(CATS.map((c) => [c, Math.round(L.categories[c].score * 100)])),
      LCP: L.audits['largest-contentful-paint'].numericValue, CLS: L.audits['cumulative-layout-shift'].numericValue, TBT: L.audits['total-blocking-time'].numericValue, version: L.lighthouseVersion, ua: L.environment.hostUserAgent })
  }
  summary[`${name}/${profile}`] = Object.fromEntries([...CATS, 'LCP', 'CLS', 'TBT'].map((k) => [k, median(runs.map((r) => r[k]))]))
  summary[`${name}/${profile}`].env = { lighthouse: runs[0].version, ua: runs[0].ua, runs: 3 }
}
writeFileSync('lighthouse/reports/summary.json', JSON.stringify(summary, null, 2)); console.table(summary)
