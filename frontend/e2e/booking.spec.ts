import { test, expect, type Page } from 'playwright/test'

// ── Helpers ────────────────────────────────────────────────────────────────

const UNIQUE_PREFIX = 'e2e'

function uniqueGuestName(): string {
  return `${UNIQUE_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const freeDateTab = (page: Page) =>
  page.locator('[data-testid="date-tab"][data-free="true"]').first()

/**
 * Step "Что за встреча": pick the first seeded event type.
 * The booking flow then opens (slots load asynchronously).
 */
async function pickFirstEventType(page: Page) {
  const card = page.getByTestId('event-type-card').first()
  await expect(card).toBeVisible()
  await card.click()
}

/**
 * Step "Когда": jump to the first day in the window that has free slots,
 * then take the first free slot.
 */
async function pickFirstFreeSlot(page: Page) {
  const tab = freeDateTab(page)
  await expect(tab).toBeVisible()
  await tab.click()

  const slot = page.getByTestId('slot-option').first()
  await expect(slot).toBeVisible()
  await slot.click()
}

async function fillBookingForm(page: Page, guestName: string) {
  const nameInput = page.getByLabel('Имя', { exact: false })
  await expect(nameInput).toBeVisible()
  await nameInput.fill(guestName)
}

async function submitBooking(page: Page) {
  await page.getByTestId('booking-submit').click()
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('гость создаёт бронирование: слот → обязательные данные → подтверждение и запись у владельца', async ({
  page,
}) => {
  const guestName = uniqueGuestName()

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Что за встреча' })).toBeVisible()
  await pickFirstEventType(page)
  await pickFirstFreeSlot(page)
  await fillBookingForm(page, guestName)
  await submitBooking(page)

  // Waypoint 6: экран успешного бронирования с уникальными данными.
  const confirmation = page.getByTestId('booking-confirmed')
  await expect(confirmation).toBeVisible()
  await expect(confirmation.getByText(guestName)).toBeVisible()
  await expect(confirmation.getByText('Вы записаны')).toBeVisible()

  // Waypoint 7 (bonus): бронь видна владельцу в разделе «Брони».
  await page.goto('/owner')
  await page.getByRole('tab', { name: 'Брони' }).click()
  const bookingRow = page.getByTestId('booking-row').filter({ hasText: guestName })
  await expect(bookingRow).toBeVisible()
})

test('гость не может отправить форму без обязательного имени', async ({ page }) => {
  await page.goto('/')

  await pickFirstEventType(page)
  await pickFirstFreeSlot(page)

  const nameInput = page.getByLabel('Имя', { exact: false })
  await expect(nameInput).toBeVisible()
  await nameInput.fill('')

  await submitBooking(page)

  await expect(page.getByText('Укажите имя')).toBeVisible()
  await expect(nameInput).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByTestId('booking-confirmed')).not.toBeVisible()
})