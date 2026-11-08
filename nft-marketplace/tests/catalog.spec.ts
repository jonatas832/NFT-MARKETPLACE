import { test, expect } from '@playwright/test'

test('busca, filtros combinados, ordenação, paginação e histórico (URL como fonte de verdade)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('catalog').getByRole('listitem')).toHaveCount(12)
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.getByLabel('Categoria').selectOption('Arte')            // mudar filtro reinicia a paginação
  await expect(page).not.toHaveURL(/page=/)
  await page.getByLabel('Ordenar').selectOption('price-asc')
  await page.getByLabel('Buscar').fill('Space')
  await expect(page).toHaveURL(/q=Space/)
  await expect(page).toHaveURL(/category=Arte/)
  await expect(page).toHaveURL(/sort=price-asc/)
  const first = page.getByTestId('catalog').getByRole('link').first()
  await expect(first).toContainText('Space Walker')

  await page.reload()                                                  // refresh preserva estado
  await expect(page.getByLabel('Categoria')).toHaveValue('Arte')
  await expect(page.getByLabel('Buscar')).toHaveValue('Space')
  await page.goBack(); await page.goBack()                              // histórico restaura a navegação anterior
  await expect(page).not.toHaveURL(/sort=price-asc/)
})

test('resultado vazio oferece limpar filtros', async ({ page }) => {
  await page.goto('/?q=zzzz-inexistente')
  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page.getByTestId('catalog')).toBeVisible()
})

test('skeleton com latência alta e recuperação após falha', async ({ page }) => {
  await page.goto('/?scenario=slow')
  await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
  await expect(page.getByTestId('catalog')).toBeVisible({ timeout: 10_000 })
  await page.goto('/?scenario=server-error')
  await expect(page.getByRole('alert')).toContainText('Erro interno')
  await page.goto('/?scenario=default')
  await expect(page.getByTestId('catalog')).toBeVisible()
})
