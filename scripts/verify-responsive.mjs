import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import { chromium, firefox } from 'playwright'

const outputDirectory = resolve('.output/public')
const host = '127.0.0.1'
const port = Number(process.env.RESPONSIVE_PREVIEW_PORT ?? 4174)
const baseUrl = `http://${host}:${port}`
const defaultWidths = [320, 390, 512, 720, 768, 1024, 1440]
const widths = process.env.RESPONSIVE_WIDTHS
  ? process.env.RESPONSIVE_WIDTHS.split(',').map(Number)
  : defaultWidths
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

try {
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(port, host, resolveListen)
  })
  const browserType = process.env.RESPONSIVE_BROWSER === 'firefox' ? firefox : chromium
  browser = await browserType.launch({ headless: true })

  for (const route of [...routesToCheck, ...(routesToCheck.length === routes.length ? ['/404.html', notFoundRoute] : [])]) {
    const page = await browser.newPage()
    try {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 })
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'load', timeout: 20000 })
        const expectsNotFound = route === notFoundRoute
        if (expectsNotFound ? response?.status() !== 404 : !response?.ok()) {
          failures.push(`${route} at ${width}px returned HTTP ${response?.status() ?? 'no response'}`)
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
            viewport: innerWidth,
            documentWidth: root.scrollWidth,
            bodyWidth: body.scrollWidth,
            fixtureOverflow,
            respectTextWidth: respectText ? Math.round(respectText.getBoundingClientRect().width) : null,
            respectParentWidth: respectParent ? Math.round(respectParent.clientWidth) : null,
          }
        })

        if (result.documentWidth > width + 1 || result.bodyWidth > width + 1) {
          failures.push(`${route} at ${width}px overflows horizontally (document ${result.documentWidth}px, body ${result.bodyWidth}px)`)
        }

        if (route === '/' && result.fixtureOverflow) {
          failures.push(`Home respect note overflows with the long copy fixture at ${width}px`)
        }

        if (expectsNotFound && !await page.getByRole('heading', { name: 'We couldn’t find that page.' }).count()) {
          failures.push(`The missing route did not render the custom 404 page at ${width}px`)
        }

        if (route === '/' && result.respectTextWidth !== null && result.respectTextWidth < result.respectParentWidth - 2) {
          failures.push(`Home respect note uses ${result.respectTextWidth}px of ${result.respectParentWidth}px available at ${width}px`)
        }
      }
    } finally {
      await page.close()
    }
  }

  if (failures.length) {
    throw new Error(`Responsive layout checks failed:\n- ${failures.join('\n- ')}`)
  }

  console.log(`${browserType.name()} responsive layout passed: ${routesToCheck.length} generated routes${routesToCheck.length === routes.length ? ', the custom 404, and its missing-route fallback' : ''} at ${widths.join(', ')} CSS px.`)
} finally {
  await browser?.close()
  await new Promise(resolveClose => server.close(resolveClose))
}
