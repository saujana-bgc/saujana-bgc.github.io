import { createReadStream } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import { chromium, firefox } from 'playwright'

const outputDirectory = resolve('.output/public')
const host = '127.0.0.1'
const port = Number(process.env.RESPONSIVE_PREVIEW_PORT ?? 4174)
const baseUrl = `http://${host}:${port}`
const defaultWidths = [320, 360, 390, 430, 512, 720, 768, 1024, 1440]
const widths = process.env.RESPONSIVE_WIDTHS
  ? process.env.RESPONSIVE_WIDTHS.split(',').map(Number)
  : defaultWidths
const viewports = [
  ...widths.map(width => ({ width, height: width === 320 ? 568 : 900 })),
  { width: 568, height: 320 },
  { width: 844, height: 390 },
]
const notFoundRoute = '/responsive-audit-missing-route/'

async function collectGeneratedRoutes(directory = outputDirectory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const routes = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      routes.push(...await collectGeneratedRoutes(path))
    } else if (entry.name === 'index.html') {
      const route = relative(outputDirectory, path)
        .split(sep)
        .slice(0, -1)
        .join('/')
      routes.push(route ? `/${route}/` : '/')
    }
  }

  return routes.sort()
}

const contentTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, baseUrl).pathname)
    let filePath = resolve(outputDirectory, `.${pathname}`)
    if (filePath !== outputDirectory && !filePath.startsWith(`${outputDirectory}${sep}`)) {
      response.writeHead(403).end()
      return
    }

    try {
      if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html')
    } catch {
      if (!/\.[^/]+$/.test(pathname)) filePath = join(filePath, 'index.html')
    }

    try {
      await stat(filePath)
    } catch {
      filePath = join(outputDirectory, '404.html')
      response.statusCode = 404
    }

    response.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(400).end()
  }
})

const routes = await collectGeneratedRoutes()
if (!routes.length) throw new Error(`No generated routes found in ${outputDirectory}`)
const routesToCheck = process.env.RESPONSIVE_ROUTES
  ? process.env.RESPONSIVE_ROUTES.split(',')
  : routes
if (routesToCheck.some(route => !routes.includes(route))) {
  throw new Error('RESPONSIVE_ROUTES must contain generated route paths.')
}

let browser
const failures = []

async function checkGatheringAttendeeLayout(browser) {
  const eventFixtures = [
    { id: 'responsive-plain', name: 'Responsive fixture', date: '2099-11-22', time: '12:00', venue: 'Test venue', venue_url: null, description: 'Responsive layout fixture', flyer_path: null },
    { id: 'responsive-photo', name: 'Responsive photo fixture', date: '2099-11-23', time: '12:00', venue: 'Eleven at Saujana', venue_url: null, description: 'Responsive layout fixture', flyer_path: null },
  ]
  const attendeeFixtures = eventFixtures.map((event, index) => ({
    id: `responsive-attendee-${index}`,
    event_id: event.id,
    name: 'A long attendee name for the mobile fixture',
    eta: '13:00',
    amount_spent: 12.5,
    bringing_games: 'Codenames',
    notes: 'A long note for checking that attendee details still wrap within the mobile card.',
  }))
  const venuePhoto = await readFile(join(outputDirectory, 'images/venues/eleven_at_saujana.avif'))
  const page = await browser.newPage({ isMobile: true, hasTouch: true, deviceScaleFactor: 2 })

  try {
    await page.route('**/*', async route => {
      const requestUrl = new URL(route.request().url())
      if (requestUrl.origin === baseUrl) return route.continue()
      if (requestUrl.pathname === '/images/venues/eleven_at_saujana.avif') return route.fulfill({ contentType: 'image/avif', body: venuePhoto })
      if (requestUrl.pathname === '/rest/v1/events') return route.fulfill({ json: eventFixtures })
      if (requestUrl.pathname === '/rest/v1/attendees') return route.fulfill({ json: attendeeFixtures })
      if (requestUrl.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({ json: [] })
      return route.abort()
    })

    for (const width of [320, 360, 390, 430, 767, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${baseUrl}/gatherings/`, { waitUntil: 'load', timeout: 20000 })

      for (const event of eventFixtures) {
        const details = page.locator(`#gathering-${event.id} .attendee-list-details`)
        await details.locator('summary').click()
        await details.getByText('1 signed up', { exact: true }).waitFor()

        if (width >= 768) {
          const tableWrap = details.locator('.attendees-table-wrap')
          const fits = await tableWrap.evaluate(wrapper => {
            const button = wrapper.querySelector('.td-delete > button')
            if (!button || wrapper.scrollWidth > wrapper.clientWidth) return false
            const cellBounds = button.closest('td').getBoundingClientRect()
            const buttonBounds = button.getBoundingClientRect()
            return buttonBounds.width >= 44 && buttonBounds.left >= cellBounds.left && buttonBounds.right <= cellBounds.right
          })
          if (!await tableWrap.isVisible() || await details.locator('.attendees-cards').isVisible() || !fits) {
            failures.push(`Gathering attendee table does not fit at ${width}px in ${event.id} fixture`)
          }
          continue
        }

        const result = await details.evaluate(element => {
          const card = element.querySelector('.attendee-card')
          if (!card) return { missingCard: true }
          const within = (outer, inner) => {
            const outerRect = outer.getBoundingClientRect()
            const innerRect = inner.getBoundingClientRect()
            return innerRect.left >= outerRect.left - 1 && innerRect.right <= outerRect.right + 1
          }
          return {
            isMobileCards: getComputedStyle(element.querySelector('.attendees-cards')).display !== 'none',
            cardFitsList: within(element, card),
            cardFitsEvent: within(element.closest('.event-card'), card),
            controlsFit: [...card.querySelectorAll('.card-field > input, .card-field > textarea, .card-header > button')]
              .every(control => within(card, control)),
          }
        })

        if (!result.isMobileCards || result.missingCard || !result.cardFitsList || !result.cardFitsEvent || !result.controlsFit) {
          failures.push(`Gathering attendee card clips at ${width}px in ${event.id} fixture`)
        }
      }
    }
  } finally {
    await page.close()
  }
}

async function checkMobileNavigation(browser) {
  const page = await browser.newPage({ isMobile: true, hasTouch: true })

  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport)
      await page.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 20000 })
      await page.getByRole('button', { name: 'Menu' }).click()
      const navigation = page.getByRole('navigation', { name: 'Explore Saujana' })
      await navigation.waitFor({ state: 'visible' })
      await page.waitForTimeout(350)
      const result = await navigation.evaluate(element => {
        const bounds = element.getBoundingClientRect()
        const links = [...element.querySelectorAll('a')]
        const drawerBody = element.parentElement
        return {
          fitsViewport: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.top <= innerHeight,
          drawerScrolls: getComputedStyle(drawerBody).overflowY === 'auto' && drawerBody.scrollHeight > drawerBody.clientHeight,
          linksHaveTouchTargets: links.every(link => link.getBoundingClientRect().height >= 44),
          linkCount: links.length,
        }
      })
      if (!result.fitsViewport || !result.drawerScrolls || !result.linksHaveTouchTargets || !result.linkCount) {
        failures.push(`Mobile navigation does not fit or has small links at ${viewport.width}×${viewport.height}px`)
      }
      await page.getByRole('button', { name: 'Close' }).click()
    }
  } finally {
    await page.close()
  }
}

async function checkMobilePageInteractions(browser) {
  const page = await browser.newPage({ isMobile: true, hasTouch: true })

  try {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`${baseUrl}/collection/`, { waitUntil: 'load', timeout: 20000 })
    await page.getByRole('searchbox').waitFor({ state: 'visible' })
    await page.getByRole('searchbox').fill('Just One')
    const gameButton = page.getByRole('button', { name: 'View Just One', exact: true })
    await gameButton.waitFor({ state: 'visible' })
    await gameButton.tap()
    const sheet = page.locator('.modal-container')
    const closeButton = page.getByRole('button', { name: 'Close game details' })
    await sheet.evaluate(element => { element.scrollTop = element.scrollHeight })
    await closeButton.waitFor({ state: 'visible' })
    const closeBounds = await closeButton.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return { top: bounds.top, bottom: bounds.bottom, viewportHeight: innerHeight }
    })
    if (closeBounds.top < 0 || closeBounds.bottom > closeBounds.viewportHeight) {
      failures.push('Collection close button is hidden while scrolling game details on a phone')
    }
    await closeButton.tap()
    await sheet.waitFor({ state: 'hidden' })

    await page.goto(`${baseUrl}/riichi-calculator/`, { waitUntil: 'load', timeout: 20000 })
    const guideHeight = await page.locator('.tutorial-trigger').evaluate(element => element.getBoundingClientRect().height)
    const firstTileTop = await page.locator('.tile-picker-button').first().evaluate(element => element.getBoundingClientRect().top)
    if (guideHeight < 44) failures.push(`Calculator guide touch target is only ${Math.round(guideHeight)}px tall at 320×568px`)
    if (firstTileTop > 700) failures.push(`Calculator first tile begins at ${Math.round(firstTileTop)}px at 320×568px`)

    await page.getByRole('button', { name: /Han and fu/ }).tap()
    await page.getByRole('button', { name: 'Set total to 5 han' }).tap()
    await page.getByRole('button', { name: 'View breakdown' }).tap()
    await page.locator('#score-breakdown').waitFor({ state: 'visible' })
    if (await page.locator('.result-panel').isVisible()) {
      failures.push('Calculator result panel covers the expanded score breakdown on a short phone')
    }
  } finally {
    await page.close()
  }
}

try {
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(port, host, resolveListen)
  })
  const browserType = process.env.RESPONSIVE_BROWSER === 'firefox' ? firefox : chromium
  browser = await browserType.launch({ headless: true })

  if (routesToCheck.includes('/gatherings/')) await checkGatheringAttendeeLayout(browser)
  await checkMobileNavigation(browser)
  await checkMobilePageInteractions(browser)

  for (const route of [...routesToCheck, ...(routesToCheck.length === routes.length ? ['/404.html', notFoundRoute] : [])]) {
    const page = await browser.newPage()
    try {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'load', timeout: 20000 })
        const expectsNotFound = route === notFoundRoute
        if (expectsNotFound ? response?.status() !== 404 : !response?.ok()) {
          failures.push(`${route} at ${viewport.width}×${viewport.height}px returned HTTP ${response?.status() ?? 'no response'}`)
          continue
        }

        if (route === '/birthday-club-calendar/') {
          await page.waitForURL(url => url.pathname.startsWith('/admin/birthday-club'), { timeout: 5000 })
        }
        await page.locator('body').waitFor({ timeout: 5000 })
        await page.waitForTimeout(100)

        const result = await page.evaluate(() => {
          const root = document.documentElement
          const body = document.body
          const respectText = document.querySelector('.respect-note p')
          const respectParent = respectText?.parentElement
          let fixtureOverflow = false
          if (respectText) {
            const originalText = respectText.textContent
            respectText.textContent = 'Everyone should feel welcome at every gathering. We make room for new players, returning friends, helpful questions, thoughtful boundaries, and the small details that help people feel comfortable around the table.'
            fixtureOverflow = respectText.scrollWidth > respectText.clientWidth
            respectText.textContent = originalText
          }
          return {
            viewport: { width: innerWidth, height: innerHeight },
            documentWidth: root.scrollWidth,
            bodyWidth: body.scrollWidth,
            fixtureOverflow,
            respectTextWidth: respectText ? Math.round(respectText.getBoundingClientRect().width) : null,
            respectParentWidth: respectParent ? Math.round(respectParent.clientWidth) : null,
          }
        })

        if (result.documentWidth > viewport.width + 1 || result.bodyWidth > viewport.width + 1) {
          failures.push(`${route} at ${viewport.width}×${viewport.height}px overflows horizontally (document ${result.documentWidth}px, body ${result.bodyWidth}px)`)
        }

        if (route === '/' && result.fixtureOverflow) {
          failures.push(`Home respect note overflows with the long copy fixture at ${viewport.width}×${viewport.height}px`)
        }

        if (expectsNotFound && !await page.getByRole('heading', { name: 'We couldn’t find that page.' }).count()) {
          failures.push(`The missing route did not render the custom 404 page at ${width}px`)
        }

        if (route === '/' && result.respectTextWidth !== null && result.respectTextWidth < result.respectParentWidth - 2) {
          failures.push(`Home respect note uses ${result.respectTextWidth}px of ${result.respectParentWidth}px available at ${viewport.width}×${viewport.height}px`)
        }
      }
    } finally {
      await page.close()
    }
  }

  if (failures.length) {
    throw new Error(`Responsive layout checks failed:\n- ${failures.join('\n- ')}`)
  }

  console.log(`${browserType.name()} responsive layout passed: ${routesToCheck.length} generated routes${routesToCheck.length === routes.length ? ', the custom 404, and its missing-route fallback' : ''} at ${viewports.map(({ width, height }) => `${width}×${height}`).join(', ')} CSS px.`)
} finally {
  await browser?.close()
  await new Promise(resolveClose => server.close(resolveClose))
}
