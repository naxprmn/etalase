import { test, expect } from '@playwright/test';
import { Pool } from 'pg';

const TEST_JUDUL = 'Pengawasan Kampanye Rapat Akbar Pilkada 2026';
const DB_URL = process.env.DATABASE_URL || 'postgresql://alas_user:change-this-strong-password@127.0.0.1:5433/alas';

test.describe.serial('Workflow Lengkap Jurnal ALAS E2E', () => {

  test.afterAll(async () => {
    // Teardown: Bersihkan data uji dari database PostgreSQL
    try {
      const pool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 3000 });
      await pool.query('DELETE FROM jurnal WHERE judul = $1', [TEST_JUDUL]);
      await pool.end();
    } catch {
      // Best-effort cleanup
    }
  });

  test('1. Skenario User (Staf): Pengisian form, validasi gagal, dan submit berhasil', async ({ page, context }) => {
    // Autentikasi sebagai Staf
    await context.addCookies([
      { name: 'lawet_token', value: 'dummy-staff-token', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/panel?tab=tambah');

    // Validasi: Klik submit saat form masih kosong
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await expect(page.locator('text=Harap lengkapi field yang wajib')).toBeVisible({ timeout: 10000 });

    // Pengisian formulir
    const judulInput = page.getByPlaceholder('Contoh : Rapat Koordinasi Persiapan Pengawasan Pilkada');
    await judulInput.fill(TEST_JUDUL);

    // Pemilihan tanggal kegiatan dari datepicker
    await page.getByText('Pilih Tanggal').click();
    const dayBtn = page.locator('.grid-cols-7 button').getByText('15', { exact: true });
    await dayBtn.waitFor({ state: 'visible', timeout: 5000 });
    await dayBtn.click();
    await expect(page.getByText('Pilih Tanggal')).not.toBeVisible({ timeout: 5000 });

    // Ringkasan kegiatan awal
    const ringkasanInput = page.getByPlaceholder('Ketik ringkasan jurnal di sini');
    await ringkasanInput.fill('Bawaslu Kebumen melakukan pengawasan melekat pada kampanye rapat akbar.');

    // Pihak terkait
    const pihakInput = page.getByPlaceholder('Contoh: KPU, Bawaslu, Kepolisian');
    if (await pihakInput.isVisible()) {
      await pihakInput.fill('KPU Kebumen, Polres Kebumen');
    }

    // Submit formulir yang sudah valid
    await submitButton.click();
    await expect(page.locator('text=Jurnal berhasil diajukan!')).toBeVisible({ timeout: 15000 });

    // Buka tab Jurnal Saya dan verifikasi status awal adalah 'Menunggu Review'
    await page.goto('/panel?tab=jurnal');
    const staffCard = page.locator('h4').filter({ hasText: TEST_JUDUL });
    await expect(staffCard).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Menunggu Review').first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Skenario Kasubag: Meninjau antrean, validasi catatan revisi, dan tolak/kembalikan jurnal', async ({ page, context }) => {
    // Autentikasi sebagai Kasubag (approver)
    await context.clearCookies();
    await context.addCookies([
      { name: 'lawet_token', value: 'dummy-kasubag-token', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/panel?tab=approval');

    // Verifikasi jurnal muncul di antrean approval Kasubag (kartu antrean kiri)
    const antreanCard = page.locator('h4').filter({ hasText: TEST_JUDUL });
    await expect(antreanCard).toBeVisible({ timeout: 10000 });
    await antreanCard.click();

    // Buka modal tolak/kembalikan
    const tolakBtn = page.getByRole('button', { name: 'Tolak/Kembalikan' });
    await expect(tolakBtn).toBeVisible({ timeout: 5000 });
    await tolakBtn.click();

    // Verifikasi modal penolakan terbuka
    await expect(page.getByText('Tolak Jurnal ini?')).toBeVisible({ timeout: 5000 });

    // Validasi: Kirim penolakan tanpa mengisi catatan pengembalian
    const kirimPenolakanBtn = page.getByRole('button', { name: 'Kirim Penolakan' });
    await kirimPenolakanBtn.click();
    await expect(page.getByText('Harap isi catatan pengembalian.')).toBeVisible({ timeout: 5000 });

    // Isi catatan pengembalian yang valid
    const catatanInput = page.getByPlaceholder('Jelaskan bagian yang perlu diperbaiki....');
    await catatanInput.fill('Harap tambahkan rincian personel pengawas dan lokasi tepat kegiatan.');
    await kirimPenolakanBtn.click();

    // Verifikasi notifikasi konfirmasi penolakan
    await expect(page.locator('role=status').or(page.getByText('dikembalikan ke pengaju'))).toBeVisible({ timeout: 10000 });
  });

  test('3. Skenario User (Staf): Melihat status ditolak, membaca catatan revisi, dan mengajukan perbaikan', async ({ page, context }) => {
    // Autentikasi kembali sebagai Staf
    await context.clearCookies();
    await context.addCookies([
      { name: 'lawet_token', value: 'dummy-staff-token', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/panel?tab=jurnal');

    // Klik tab 'Dalam Proses'
    const prosesTab = page.getByRole('button', { name: 'Dalam Proses' });
    if (await prosesTab.isVisible()) {
      await prosesTab.click();
    }

    // Verifikasi kartu jurnal memiliki badge 'Dikembalikan' dan menampilkan catatan pengembalian
    const rejectedCard = page.locator('h4').filter({ hasText: TEST_JUDUL });
    await expect(rejectedCard).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Dikembalikan').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Harap tambahkan rincian personel pengawas')).toBeVisible({ timeout: 10000 });

    // Klik 'Perbaiki & Ajukan Ulang'
    const perbaikiBtn = page.getByRole('button', { name: 'Perbaiki & Ajukan Ulang' }).first();
    await perbaikiBtn.click();

    // Menunggu transisi ke form edit
    await page.waitForURL(/tab=edit/);

    // Perbarui isi ringkasan sesuai permintaan revisi
    const ringkasanInput = page.getByPlaceholder('Ketik ringkasan jurnal di sini');
    await ringkasanInput.fill('Bawaslu Kebumen melakukan pengawasan melekat pada kampanye rapat akbar bersama 15 personel Panwascam di Alun-alun Kebumen.');

    // Simpan perbaikan
    const simpanBtn = page.getByRole('button', { name: 'Simpan Perubahan' });
    await simpanBtn.click();

    // Verifikasi toast keberhasilan perbaruan
    await expect(page.locator('text=Jurnal berhasil diperbarui!')).toBeVisible({ timeout: 15000 });
  });

  test('4. Skenario Kasubag: Menyetujui jurnal hasil revisi', async ({ page, context }) => {
    // Autentikasi sebagai Kasubag
    await context.clearCookies();
    await context.addCookies([
      { name: 'lawet_token', value: 'dummy-kasubag-token', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/panel?tab=approval');

    // Verifikasi jurnal kembali masuk ke antrean approval setelah perbaikan
    const antreanCard = page.locator('h4').filter({ hasText: TEST_JUDUL });
    await expect(antreanCard).toBeVisible({ timeout: 10000 });
    await antreanCard.click();

    // Buka modal persetujuan
    const setujuBtn = page.getByRole('button', { name: 'Setuju jurnal' });
    await expect(setujuBtn).toBeVisible({ timeout: 5000 });
    await setujuBtn.click();

    // Konfirmasi persetujuan di dalam modal
    await expect(page.getByText('Setujui Jurnal ini?')).toBeVisible({ timeout: 5000 });
    const konfirmasiBtn = page.getByRole('button', { name: 'Setujui Jurnal' });
    await konfirmasiBtn.click();

    // Verifikasi notifikasi jurnal disetujui dan diterbitkan
    await expect(page.locator('role=status').or(page.getByText('disetujui dan sedang diterbitkan'))).toBeVisible({ timeout: 15000 });
  });

  test('5. Skenario Publik: Pengunjung umum melihat jurnal terbit di tampilan luar dan mencari data', async ({ page, context }) => {
    // Pengunjung umum (tanpa autentikasi cookie)
    await context.clearCookies();

    // Buka halaman depan (portal publik)
    await page.goto('/');

    // Verifikasi elemen halaman depan publik terbuka
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });

    // Gunakan pencarian publik untuk menemukan jurnal yang baru disetujui
    const searchInput = page.getByPlaceholder('Cari artikel, topik, penulis...');
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill('Pengawasan Kampanye Rapat Akbar');

    // Verifikasi kartu jurnal muncul di arsip publik
    const cardTitle = page.locator('#section-arsip h3').filter({ hasText: TEST_JUDUL });
    await expect(cardTitle).toBeVisible({ timeout: 15000 });

    // Klik kartu jurnal untuk membuka modal rincian publik
    await cardTitle.click();

    // Verifikasi detail dialog terbuka dan menampilkan deskripsi revisi
    const modalContent = page.getByText('bersama 15 personel Panwascam di Alun-alun Kebumen');
    await expect(modalContent).toBeVisible({ timeout: 10000 });

    // Tutup modal detail publik
    const closeBtn = page.locator('button[aria-label="Tutup"]').or(page.locator('.fixed.inset-0 button').first());
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

});
