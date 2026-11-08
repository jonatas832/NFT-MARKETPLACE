import { test, expect } from '@playwright/test'
import { loginViaUi } from './helpers'

test('perfil: validação, persistência após refresh, senha e carteiras', async ({ page }) => {
  await loginViaUi(page); await page.goto('/profile')
  await page.getByLabel('Nome', { exact: true }).fill('A'); await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Nome muito curto.')).toBeVisible()
  await page.getByLabel('Nome', { exact: true }).fill('Ana Silva'); await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('✓ Salvo')).toBeVisible(); await page.reload()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Ana Silva')

  await page.getByLabel('Senha atual').fill('errada'); await page.getByLabel('Nova senha').fill('NovaSenha@1')
  await page.getByRole('button', { name: 'Alterar senha' }).click(); await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

  await page.goto('/wallets'); await page.getByRole('button', { name: 'Adicionar carteira' }).click()
  await page.getByLabel('Nome').fill('Secundária'); await page.getByLabel('Endereço').fill('0x123')
  await page.getByRole('button', { name: 'Salvar' }).click(); await expect(page.getByText(/Endereço inválido/)).toBeVisible()
  await page.getByLabel('Endereço').fill('0x' + 'a'.repeat(40)); await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Secundária').first()).toBeVisible()
})
