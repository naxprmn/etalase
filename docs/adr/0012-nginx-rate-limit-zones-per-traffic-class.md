# ADR-0012: Zona Batas Laju Nginx per Kelas Lalu Lintas dan Jawaban 429

Status: Accepted  
Tanggal: 2026-10-23  

Melengkapi konfigurasi gateway `nginx/alas.conf` (batas laju API publik) dan jalur pengiriman Direct Service di [ADR-0001](0001-direct-service-delivery-guarantees.md).

## Konteks

Seluruh `/api/` berbagi satu zona `api_limit` (100 permintaan/menit per IP, burst 20) dan nginx menjawab 503 saat batas terlampaui. Audit 23 Okt 2026 menemukan dua akibat:

1. Lawet Hub mengirim batch outbox 20 event tiap 15 detik ditambah bacaan daftar, semuanya dari satu IP ke `/api/service/*`. Lonjakan (mis. rekonsiliasi atau banyak persetujuan) dapat melampaui batas publik dan menerima 503 yang tidak dapat dibedakan dari galat server.
2. Satu halaman panel dapat memuat puluhan foto lewat `/api/v1/jurnal-alas/media/*`; foto di atas burst 20 gagal dimuat.

## Keputusan

1. **Tiga zona**: `api_limit` (publik, 100/mnt, burst 20, tidak berubah), `media_limit` (proxy media panel, 600/mnt, burst 100), dan `service_limit` (Direct Service, 1200/mnt, burst 200). Lokasi yang lebih spesifik (`/api/service/`, `/api/v1/jurnal-alas/media/`) memakai zona sendiri; sisanya tetap di `/api/`.
2. **`limit_req_status 429`** di seluruh server, sehingga klien dan outbox Lawet Hub memperlakukannya sebagai kegagalan sementara yang dicoba ulang dengan backoff.
3. Service API tetap dilindungi bearer + HMAC; pelonggaran batas laju tidak mengubah otentikasi. Pembatasan IP asal (allowlist alamat Lawet Hub) dapat ditambahkan di proxy publik dan tidak diwajibkan di sini.

## Konsekuensi

- Pengiriman outbox dan pemuatan foto panel tidak lagi bersaing dengan batas API publik; API publik tetap paling ketat.
- Penolakan karena batas laju kini berstatus 429, bukan 503; pemantau yang menghitung 503 sebagai galat server tidak akan lagi menghitungnya.
- Bila ALAS berada di belakang tunnel/reverse proxy yang tidak meneruskan IP klien, `$binary_remote_addr` adalah alamat proxy dan semua klien berbagi satu bucket; pada kasus itu konfigurasi `set_real_ip_from`/`real_ip_header` harus ditambahkan sesuai topologi (dicatat di `docs/ops/KNOWN_ISSUES.md`).
- Tes kontrak konfigurasi: `tests/nginx_rate_limits.test.ts`; sintaks diperiksa dengan `nginx -t` pada image `nginx:1.25-alpine`.
