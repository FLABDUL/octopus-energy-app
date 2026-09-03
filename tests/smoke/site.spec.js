import { test, expect } from '@playwright/test'

function monitorPage(page) {
  const errors = []

  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })

  return errors
}

test('landing page and safe health endpoint work', async ({ page, request }) => {
  const errors = monitorPage(page)
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

  expect(response?.ok()).toBeTruthy()
  await expect(page.getByRole('heading', { level: 1, name: /See where your energy/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View the interactive demo' })).toBeVisible()

  const healthResponse = await request.get('/api/health')
  expect(healthResponse.ok()).toBeTruthy()
  const health = await healthResponse.json()
  expect(health.status).toBe('ok')
  expect(Object.keys(health).sort()).toEqual([
    'aiAvailable',
    'aiFallbackAvailable',
    'aiProvider',
    'monthlyReportConfigured',
    'octopusConfigured',
    'status',
  ])
  expect(errors).toEqual([])
})

test('credential-free demo remains interactive', async ({ page }) => {
  const errors = monitorPage(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'View the interactive demo' }).click()

  await expect(page.getByText('Demo data', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /^Good / })).toBeVisible()
  await expect(page.getByText('Total consumption', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Consumption over time' })).toBeVisible()

  await page.getByLabel('History range').selectOption('7')
  await expect(page.getByText('7-day overview', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Gas' }).click()
  await expect(page.getByText('Daily gas', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Change account' }).click()
  await expect(page.getByRole('heading', { name: 'Connect your account' })).toBeVisible()
  expect(errors).toEqual([])
})

test('monthly report cannot run without authorisation', async ({ request }) => {
  const response = await request.get('/api/cron/monthly-report')
  expect(response.status()).toBe(401)
  await expect(response.json()).resolves.toEqual({ error: 'Unauthorized.' })
})
