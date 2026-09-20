// Screenshot every act with the real Edge engine (used for visual QA only).
import puppeteer from 'puppeteer-core'
const out = process.argv[2] ?? './shots'
const width = Number(process.argv[3] ?? 1440)
const height = Number(process.argv[4] ?? 900)
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width, height, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message))
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await wait(4500)
await page.screenshot({ path: `${out}/1-hook.png` })
for (const [id, name] of [['river', '2-river'], ['threads', '3-threads'], ['roll', '4-roll']]) {
  await page.evaluate((id) => document.getElementById(`act-${id}`).scrollIntoView({ behavior: 'auto' }), id)
  await wait(2200)
  await page.screenshot({ path: `${out}/${name}.png` })
}
// open a day drawer via the first receipt line
await page.evaluate(() => document.getElementById('act-river').scrollIntoView({ behavior: 'auto' }))
await wait(800)
await page.evaluate(() => window.scrollBy(0, 700))
await wait(1500)
await page.screenshot({ path: `${out}/2b-feed.png` })
const btn = await page.$('.receipt button')
if (btn) { await btn.click(); await wait(1800); await page.screenshot({ path: `${out}/5-drawer.png` }) }
await browser.close()
console.log('shots written to', out)
