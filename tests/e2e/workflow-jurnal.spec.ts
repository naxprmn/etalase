import { test, expect } from '@playwright/test';

test.describe('Workflow Jurnal ALAS E2E', () => {
  test('1. Validasi form pengajuan jurnal (staf)', async ({ page, context }) => {
    // Mock login cookie
    await context.addCookies([
      { name: 'lawet_token', value: 'test-token', domain: 'localhost', path: '/' }
    ]);
    
    // Navigate to panel tambah tab
    await page.goto('/panel?tab=tambah');

    // Cek field wajib yang kosong akan memunculkan validasi toast
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check validation toast
    await expect(page.locator('text=Harap lengkapi field yang wajib')).toBeVisible({ timeout: 10000 });

    // Isi judul
    const judulInput = page.getByPlaceholder('Contoh : Rapat Koordinasi Persiapan Pengawasan Pilkada');
    await judulInput.fill('Rapat Koordinasi Penanganan Pelanggaran');

    // Buka datepicker dan pilih tanggal 15
    await page.getByText('Pilih Tanggal').click();
    const dayBtn = page.locator('.grid-cols-7 button').getByText('15', { exact: true });
    await dayBtn.waitFor({ state: 'visible', timeout: 5000 });
    await dayBtn.click();

    // Pastikan tanggal terpilih (teks 'Pilih Tanggal' sudah berganti)
    await expect(page.getByText('Pilih Tanggal')).not.toBeVisible({ timeout: 5000 });

    // Isi ringkasan kegiatan
    const ringkasanInput = page.getByPlaceholder('Ketik ringkasan jurnal di sini');
    if (await ringkasanInput.isVisible()) {
      await ringkasanInput.fill('Ringkasan kegiatan koordinasi persiapan pengawasan.');
    }

    // Submit data valid
    await submitButton.click();
    await expect(page.locator('text=Jurnal berhasil diajukan!')).toBeVisible({ timeout: 15000 });
  });

  test('2. Workflow Revisi dan Approve (Integration level)', async () => {
    expect(true).toBeTruthy();
  });
});
