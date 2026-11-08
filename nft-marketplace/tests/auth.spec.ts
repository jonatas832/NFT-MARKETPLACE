import { test, expect } from '@playwright/test'
import { ANA, BRUNO, loginViaUi, mock } from './helpers'

test('cadastro com conflito, login, expiração, logout e troca de usuário', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('Teste'); await page.getByLabel('E-mail').fill(ANA.email); await page.getByLabel('Senha').fill('12345678')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('E-mail já cadastrado.').first()).toBeVisible()

  await page.getByLabel('E-mail').fill('novo@nft.dev'); await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()

  await loginViaUi(page, ANA)
  await page.goto('/profile'); await mock(page, 'expire-session')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page).toHaveURL(/\/login\?.*redirect=%2Fprofile/)
  await expect(page.getByText('Sua sessão expirou').first()).toBeVisible()

  await page.getByLabel('E-mail').fill(BRUNO.email); await page.getByLabel('Senha').fill(BRUNO.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/profile/)
  await expect(page.getByLabel('Nome')).toHaveValue('Bruno Colecionador') // sem dados da sessão anterior
})
test('rota privada redireciona e retorna após login', async ({ page }) => {
  await page.goto('/wallets'); await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('E-mail').fill(ANA.email); await page.getByLabel('Senha').fill(ANA.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Carteiras' })).toBeVisible()
})
