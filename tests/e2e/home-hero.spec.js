import { test, expect } from '@playwright/test'

async function prepareHome(page, context) {
  await context.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort())
  await page.addInitScript(() => sessionStorage.setItem('ceda.splash.seen', '1'))
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`homepage slideshow has no old image underneath and preserves scrolling at ${viewport.width}px`, async ({ page, context }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await prepareHome(page, context)
    const oldImageRequests = []
    page.on('request', request => {
      if (/\/images\/ceda-hero(?:1)?\.png(?:\?|$)/.test(request.url())) oldImageRequests.push(request.url())
    })
    await page.goto('/')
    const hero = page.locator('.ceda-hero-image')
    const slides = hero.locator('.ceda-slide')
    await expect(slides).toHaveCount(4)
    await slides.evaluateAll(images => Promise.all(images.map(image => image.decode())))
    expect(await hero.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none')
    expect(oldImageRequests).toEqual([])
    const loadedImages = await slides.evaluateAll(images => images.map(image => ({
      source: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight,
    })))
    expect(loadedImages.every(image => image.source.includes('/images/optimized/') && image.width <= 1920 && image.height > 0)).toBe(true)
    await expect(page.locator('.landing-header')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Enter the portal', exact: true })).toBeVisible()
    const fullWidth = await hero.evaluate(element => element.getBoundingClientRect().width)
    for (let index = 1; index < 4; index++) {
      await page.getByRole('button', { name: 'Next slide', exact: true }).click()
      await expect(slides.nth(index)).toHaveClass(/is-active/)
    }
    await page.getByRole('button', { name: 'Next slide', exact: true }).click()
    await expect(slides.first()).toHaveClass(/is-active/)
    await page.getByRole('button', { name: 'Previous slide', exact: true }).click()
    await expect(slides.last()).toHaveClass(/is-active/)
    await page.getByRole('button', { name: 'Show slide 2 of 4', exact: true }).click()
    await expect(slides.nth(1)).toHaveClass(/is-active/)
    for (const [offset, ratio] of [[300, 0.8], [600, 0.6], [900, 0.6], [0, 1]]) {
      await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), offset)
      await expect.poll(async () => hero.evaluate(element => element.getBoundingClientRect().width)).toBeCloseTo(fullWidth * ratio, 0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
    expect(oldImageRequests).toEqual([])
  })
}

test('homepage autoplay pauses for focus and hover and resumes after leaving the hero', async ({ page, context }) => {
  await prepareHome(page, context)
  await page.clock.install()
  await page.goto('/')
  const slides = page.locator('.ceda-slide')
  await slides.evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.mouse.move(-10, -10)
  await page.clock.runFor(6100)
  await expect(slides.nth(1)).toHaveClass(/is-active/)
  await page.locator('.ceda-hero-copy').hover()
  await page.clock.runFor(6100)
  await expect(slides.nth(1)).toHaveClass(/is-active/)
  await page.getByRole('button', { name: 'Next slide', exact: true }).focus()
  await page.mouse.move(-10, -10)
  await page.clock.runFor(6100)
  await expect(slides.nth(1)).toHaveClass(/is-active/)
  await page.getByRole('button', { name: 'Next slide', exact: true }).blur()
  await page.clock.runFor(6100)
  await expect(slides.nth(2)).toHaveClass(/is-active/)
})

test('reduced motion keeps the hero still and permits manual slide selection', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepareHome(page, context)
  await page.clock.install()
  await page.goto('/')
  const hero = page.locator('.ceda-hero-image')
  const width = await hero.evaluate(element => element.getBoundingClientRect().width)
  await page.clock.runFor(7000)
  await expect(page.locator('.ceda-slide').first()).toHaveClass(/is-active/)
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
  await page.clock.runFor(100)
  expect(await hero.evaluate(element => element.getBoundingClientRect().width)).toBeCloseTo(width, 0)
  await page.getByRole('button', { name: 'Next slide', exact: true }).click()
  await expect(page.locator('.ceda-slide').nth(1)).toHaveClass(/is-active/)
})

test('a failed slideshow image never reveals the previous static hero', async ({ page, context }) => {
  await prepareHome(page, context)
  await context.route('**/images/optimized/**', route => route.abort())
  const oldImageRequests = []
  page.on('request', request => {
    if (/\/images\/ceda-hero(?:1)?\.png(?:\?|$)/.test(request.url())) oldImageRequests.push(request.url())
  })
  await page.goto('/')
  const hero = page.locator('.ceda-hero-image')
  await expect(hero).toBeVisible()
  expect(await hero.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none')
  await page.getByRole('button', { name: 'Next slide', exact: true }).click()
  await expect(page.locator('.ceda-slide').nth(1)).toHaveClass(/is-active/)
  expect(oldImageRequests).toEqual([])
  await expect(page.getByRole('link', { name: 'Enter the portal', exact: true })).toBeVisible()
})
