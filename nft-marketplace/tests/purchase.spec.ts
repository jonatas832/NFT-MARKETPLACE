import { test, expect } from '@playwright/test'
import { addToCart, loginViaUi, mock, payUntilReview } from './helpers'

test('carrinho de visitante sobrevive ao login; cupom; compra completa até o recibo', async ({ page }) => {
  await addToCart(page)
  await page.goto('/cart'); await page.reload()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await page.getByLabel('Cupom').fill('INVALIDO'); await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom inválido.')).toBeVisible()
  await page.getByLabel('Cupom').fill('OLD20'); await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom expirado.')).toBeVisible()
  await page.getByLabel('Cupom').fill('WELCOME10'); await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByTestId('summary')).toContainText('WELCOME10')

  await page.getByRole('link', { name: 'Ir para o pagamento' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('E-mail').fill('ana@nft.dev'); await page.getByLabel('Senha').fill('Senha@123'); await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await payUntilReview(page)
  await page.getByRole('button', { name: 'Confirmar e pagar' }).dblclick()   // clique repetido ≠ pedido duplicado
  await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('tx')).toContainText('0x')
  await page.goto('/cart'); await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('pagamento recusado preserva os itens', async ({ page }) => {
  await page.goto('/?scenario=payment-declined'); await loginViaUi(page); await addToCart(page)
  await page.goto('/checkout'); await payUntilReview(page)
  await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 10_000 })
  await page.goto('/cart'); await expect(page.getByTestId('cart-line')).toHaveCount(1)
})

test('timeout após criar pedido: reenvio recupera o MESMO pedido', async ({ page }) => {
  await page.goto('/?scenario=order-timeout'); await loginViaUi(page); await addToCart(page)
  await page.goto('/checkout'); await payUntilReview(page)
  await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(page.getByText(/mesmo pedido será recuperado/)).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page).toHaveURL(/\/orders\/ord-/)
  await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 10_000 })
})

test('mudança de preço via Socket.IO durante o checkout exige nova confirmação', async ({ page }) => {
  await loginViaUi(page); await addToCart(page)
  await page.goto('/checkout'); await payUntilReview(page)
  const before = await page.getByTestId('co-total').last().textContent()
  await mock(page, 'nft', { id: 'nft-2', price: '9.9' })
  await expect(page.getByText('Preços, taxas ou disponibilidade mudaram')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar e pagar' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
  expect(await page.getByTestId('co-total').last().textContent()).not.toBe(before)
  await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 10_000 })
})
