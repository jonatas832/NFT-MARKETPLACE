import { test, expect } from '@playwright/test'
import { addToCart, loginViaUi } from './helpers'

test('navegação por teclado: skip link e foco visível', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
})
test('validação de formulário associa o erro ao campo', async ({ page }) => {
  await page.goto('/login'); await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert').first()).toBeVisible()
})
test('diálogo de revisão prende o foco e ESC fecha', async ({ page }) => {
  await loginViaUi(page); await addToCart(page); await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click(); await expect(page.getByText('Carteira conectada.')).toBeVisible()
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
})
// Baselines: gere com `npm run test:e2e:update` e versione tests/*-snapshots.
test('regressão visual: início e detalhe', async ({ page }) => {
  await page.goto('/'); await expect(page.getByTestId('catalog')).toBeVisible()
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })
  await page.goto('/nft/nft-3'); await expect(page.getByTestId('price')).toBeVisible()
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
})
test('regressão visual: carrinho e pagamento', async ({ page }) => {
  await loginViaUi(page); await addToCart(page)
  await page.goto('/cart'); await expect(page.getByTestId('summary')).toBeVisible()
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
  await page.goto('/checkout'); await expect(page.getByTestId('checkout-summary')).toBeVisible()
  await expect(page).toHaveScreenshot('checkout.png', { fullPage: true })
})
