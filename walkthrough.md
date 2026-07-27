# Walkthrough - Pembaruan Dokumentasi, Keamanan Data, Perbaikan Email, Alur Verifikasi Akun, & Pengerasan Keamanan (Security Hardening)

Semua tugas telah diselesaikan dan seluruh perubahan terkompilasi dengan sukses serta telah di-push ke repositori GitHub di branch `v2`.

## Ringkasan Perubahan

### 1. Pembersihan Tab Dokumentasi yang Rusak ("Detail Fungsional Tombol")
- Menghapus tab navigasi dan seluruh rendering blok untuk **"Detail Fungsional Tombol"** di [DocumentationPage.jsx](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/sections/documentation/DocumentationPage.jsx) karena data `buttonRegistry` tidak terdefinisi (menyebabkan crash UI saat tab ini diklik). State `activeTab` diperbarui menjadi hanya mendukung `guides` dan `testing`.

### 2. Keamanan Data & Pembersihan Informasi Sensitif
- Kami telah menyisir dan membersihkan dokumen dari nama-nama variabel lingkungan rahasia (`MIDTRANS_SERVER_KEY`, `MEMO_SIGNER_SECRET_KEY`) dan credential mentah.
- Referensi teknis diubah menjadi istilah fungsional yang aman (seperti *"kunci penandatangan server"* dan *"variabel lingkungan keamanan"*).

### 3. Fitur Edit Manual untuk Admin & Koperasi
- **API Baru (`/api/documentation`)**:
  - Menyediakan request `GET` untuk memuat data panduan secara dinamis dari database Supabase (dilengkapi dengan *fallback data* jika tabel belum siap).
  - Menyediakan request `POST` untuk memperbarui data panduan, dibatasi khusus untuk user dengan token otorisasi valid yang ber-role `developer` atau `koperasi`.
  - **Self-Healing Table**: API otomatis mendeteksi jika tabel `documentation_guides` belum ada di database Supabase dan langsung menjalankannya secara otomatis.
- **Antarmuka Pengeditan (`DocumentationPage.jsx`)**:
  - Saat user dengan role `developer`/`koperasi` login, tombol **"Mode Editor Admin"** akan muncul.
  - Admin dapat memilih tombol **"Edit Panduan Petani"** atau **"Edit Panduan Developer"**.
  - Aplikasi memunculkan kanvas pengeditan interaktif di mana admin dapat mengubah judul kategori, menyunting isi butir panduan, menambahkan butir panduan baru, menghapus baris, hingga menambah kategori panduan baru.
  - Setelah selesai, admin dapat menyimpan langsung ke database menggunakan tombol **"Simpan Perubahan"**.

### 4. Perbaikan Email Verifikasi (Anti-Blocking & Fallback Manual)
- **Konfigurasi SMTP yang Lebih Kokoh**:
  - Mengubah konfigurasi Nodemailer di [email.js](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/lib/email.js#L80) agar menggunakan konfigurasi server Gmail yang eksplisit (`host: 'smtp.gmail.com'`, `port: 465`, `secure: true`) dengan tambahan pengaturan TLS bypass `rejectUnauthorized: false` guna meredam kendala sertifikat pada serverless cloud.
- **Mekanisme Fallback Link Verifikasi Manual**:
  - **Di Sisi Backend**: Jika proses pengiriman email via SMTP Gmail/Resend gagal, API register ([route.js](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/app/api/auth/register/route.js#L140)) and resend ([route.js](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/app/api/auth/resend-verification/route.js#L71)) akan tetap sukses dan menyertakan parameter `verificationLink` secara langsung dalam format respon JSON.
  - **Di Sisi Frontend (Register & Login)**: Jika respon registrasi/kirim ulang mendeteksi kegagalan email tetapi menyediakan `verificationLink`, antarmuka pendaftaran ([RegisterPage.jsx](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/sections/register/RegisterPage.jsx#L118)) dan antarmuka masuk ([LoginPage.jsx](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/sections/login/LoginPage.jsx#L144)) akan menampilkan tombol verifikasi manual instan **"🔑 Verifikasi Akun Sekarang"** sehingga user tidak akan terhambat untuk mengaktifkan akun dan masuk ke dalam dashboard.

### 5. Perbaikan Error Vercel (Pembuangan styled-jsx)
- **Masalah**: Vercel mengalami crash/error karena di halaman `DocumentationPage.jsx` terdapat tag `<style jsx global>` bawaan Next.js lama yang tidak dikonfigurasi di App Router baru Vercel.
- **Solusi**:
  - Menghapus directive `<style jsx global>` beserta kode `@keyframes` spin dari halaman dokumentasi.
  - Mengganti pemanggilan animasi putar pada loader spinner menggunakan class bawaan TailwindCSS, yaitu **`className="animate-spin"`** yang didukung secara universal dan jauh lebih ringan.

### 6. Resolusi Error 404 Vercel (DEPLOYMENT_NOT_FOUND)
- **Masalah**: Setelah diusut, domain Vercel asli milik proyek ini adalah **`coffe-chain.vercel.app`** (menggunakan kata `chain` dan bukan `blockchain`). Namun di kode program sebelumnya serta di file `.env.local` tertulis **`coffe-blockchain.vercel.app`**. Hal ini menyebabkan link verifikasi mengarah ke domain Vercel yang salah sehingga memicu error 404 `DEPLOYMENT_NOT_FOUND`.
- **Solusi Permanen (Dynamic Host Matching)**:
  - **Identifikasi Host Otomatis**: Kami memodifikasi backend di [email.js](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/lib/email.js#L3) agar API pendaftaran dan resend-verification membaca host name secara dinamis dari header request HTTP (`request.headers.get('host')`).
  - **Hasil**: Apapun domain aktif yang sedang dibuka oleh user (baik `localhost`, domain custom, alias vercel, maupun `coffe-chain.vercel.app`), email verifikasi yang terkirim akan **selalu menggunakan domain yang benar secara otomatis**.
  - **Pembaruan Konfigurasi Fallback**: Mengubah seluruh hardcoded domain fallback di proyek (seperti pada batch-onchain API, Midtrans create-transaction API, dan file [email.js](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/lib/email.js#L3)) menjadi `coffe-chain.vercel.app`.
  - **Pembaruan Env File**: Memperbarui `.env.local` baris 6 menjadi `NEXT_PUBLIC_APP_URL=https://coffe-chain.vercel.app`.

### 7. Klarifikasi Alur Login Ulang Setelah Verifikasi Berhasil
- **Modifikasi Teks Tombol Sukses**:
  - Kami memperbarui label tombol pada halaman sukses verifikasi email ([VerifyEmailPage.jsx](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/sections/verify-email/VerifyEmailPage.jsx#L82)) dari yang sebelumnya bernaskah **"🔑 Masuk ke Dashboard"** menjadi **"🔑 Masuk & Login Ulang"**.
  - **Tujuan**: Memastikan pengguna memahami alur bahwa setelah verifikasi sukses, mereka tidak langsung dimasukkan ke dashboard (untuk keamanan sesi), melainkan diarahkan kembali ke layar Login (`/login`) untuk mengetikkan kredensial akun secara manual demi keamanan sesi baru. Setelah itu, barulah user petani berhasil masuk ke dashboard utama.

### 8. Integrasi Vercel Analytics
- **Instalasi Package**: Menginstal `@vercel/analytics` ke dependencies proyek.
- **Root Layout Integration**: Mengimpor komponen `Analytics` dari `@vercel/analytics/react` dan merendernya di dalam root [layout.jsx](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/app/layout.jsx#L29) tepat di bawah `{children}` agar secara otomatis melacak kunjungan dan kinerja aplikasi web di Vercel Analytics dashboard.

### 9. Pengujian Performa Blockchain & Pembuatan Laporan Excel (.xlsx)
- **Ekspor Data Hasil Pengujian**: Memodifikasi script [test_testnet_speed.mjs](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/test_testnet_speed.mjs#L137) agar secara otomatis mengekspor seluruh hasil pengujian dan data performa ke file JSON `perf_results.json`.
- **Generator Laporan Excel**: Membuat script Python [generate_excel.py](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/generate_excel.py) yang menggunakan `openpyxl` untuk:
  - Membaca `perf_results.json`.
  - Membuat sheet Excel [Blockchain_Performance_Report.xlsx](file:///C:/Users/Bams/.gemini/antigravity/brain/af2e5947-62a7-4201-919c-bcd34a82c913/Blockchain_Performance_Report.xlsx) yang terformat rapi dan profesional.
  - Memvisualisasikan ringkasan metrik (Total TX, Success Rate, Rata-rata Latensi, Biaya Gas SOL) dalam bentuk *summary cards* berwarna hijau khas brand CoffeeChain.
  - Membuat tabel detail log transaksi lengkap dengan kolom latensi, status, signature, dan tautan langsung (*hyperlink*) ke Solana Explorer.

### 10. Perbaikan Error Midtrans Snap Payment
- **Auto-load & Dynamic Script URL**: Mengubah pemuatan script Midtrans Snap di [page.jsx](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/app/page.jsx#L167) agar langsung ter-load pada saat komponen dipasang (`useEffect` mount) untuk menghindari keterlambatan inisialisasi script. URL script sekarang mendukung environment variable `NEXT_PUBLIC_MIDTRANS_SNAP_URL` sehingga dapat ditimpa ke URL production di Vercel secara aman.
- **Mekanisme Toleransi Latensi (Retry Loop)**: Menambahkan loop tunggu (retry loop) hingga 2 detik pada client-side sebelum memicu error popup jika `window.snap` belum sepenuhnya termuat dari CDN Midtrans, meningkatkan toleransi terhadap jaringan lambat.
- **Dynamic Webhook & Redirect Routing**: Mengubah parameter `appUrl` di backend [route.js](file:///c:/Users/Bams/Desktop/nextjs/coffee-blockchain/src/app/api/midtrans/create-transaction/route.js#L54) agar 100% dinamis mengambil dari header request HTTP host/proto, mencegah kegagalan webhook callback jika ada legacy URL domain Vercel yang tertinggal di environment dashboard.

### 11. Pengerasan Keamanan (Security Hardening & IDOR/BOLA Remediation)
- **Penghapusan Celah Pintu Belakang Administratif**:
  - Menghapus endpoint unauthenticated `/api/migrate` dan `/api/seed` secara permanen dari server agar penyerang tidak dapat mengeksekusi migrasi tabel Supabase sepihak atau menginjeksikan data dummy.
- **Enforcement Validasi Token Sesi Server-Side**:
  - Menambahkan validasi token JWT (`verifyToken`) pada seluruh REST API mutasi (POST, PATCH, DELETE).
  - Membatasi manipulasi harga pasar (`/api/market` dan `/api/markets`) khusus bagi role `koperasi` atau `developer`.
  - Membatasi pencatatan transaksi ledger `/api/transactions` khusus bagi role `koperasi` or `developer`.
  - Membatasi upload media `/api/upload` bagi pengguna terotentikasi dengan token valid.
- **Pencegahan Celah IDOR / BOLA (Insecure Direct Object Reference)**:
  - **Kelola Batch Produksi (`/api/production-batches`)**: Pengguna ber-role `farmer` hanya dapat melihat, membuat, mengubah, atau menghapus batch miliknya sendiri (`farmer_id === session.userId`). Admin `koperasi` atau `developer` memiliki kendali global penuh.
  - **Detail Tahap Produksi (`/api/production-stages`)**: Validasi server memastikan hanya petani pemilik batch yang dapat mencatat logs tahapan produksi.
  - **Kelola Produk (`/api/products`)**:
    - Petani dibatasi hanya dapat membuat, menyunting, atau menghapus produk yang diajukannya sendiri (`submitted_by === session.userId`).
    - Modifikasi status persetujuan produk (`status` menjadi `published` atau sebaliknya) hanya diperbolehkan bagi admin (`koperasi`/`developer`). Petani dilarang mengubah status persetujuan produknya sendiri.
  - **coffee-trace (`/api/coffee-trace`)**: Pendaftaran trace kopi terikat pada token otentik milik petani pemilik produk.
- **Verifikasi Transaksi Solana On-Chain**:
  - Di endpoint check order `/api/public/order/[orderId]` method `PATCH` (proses verifikasi SOL transfer), server-side sekarang melakukan verifikasi on-chain langsung ke Solana Network RPC (`https://api.testnet.solana.com`).
  - Server memeriksa bahwa transaksi sukses (`tx.meta?.err` null), instruksi transfer berasal dari wallet pembeli menuju dompet resmi `STORE_WALLET` (`8erURhHZgSvoFeXAJSDWzk2JDEiLsWeKq11zpiPs7AhJ`), dan jumlah lamports sesuai dengan pesanan (`order.solAmount`). Hal ini mencegah manipulasi respons/signature palsu dan salah hitung akibat network fee.

---

## Verifikasi & Pengujian

### 1. Build Produksi Sukses
Kami kembali menjalankan perintah build produksi Next.js secara lokal setelah menerapkan pengerasan keamanan:
```bash
npm run build
```
- **Hasil**: Kompilasi berhasil (`Compiled successfully`) dengan rincian dynamic server-rendering pada seluruh API dinamis tanpa kendala.

### 2. Pengujian Latensi Solana Testnet & Pembuatan Laporan Excel
Kami menjalankan perintah pengujian performa dan generator laporan:
```bash
node test_testnet_speed.mjs
python generate_excel.py
```
- **Hasil Pengujian**:
  - Total Transaksi terkirim: **3 dari 3** berhasil (Success Rate **100%**).
  - Rata-rata Durasi Konfirmasi: **0.68 detik** (Tercepat: 0.54s, Terlambat: 0.95s).
  - Total Biaya Gas Transaksi: **0.0000156 SOL** (sangat efisien).
  - File Excel laporan performa **[Blockchain_Performance_Report.xlsx](file:///C:/Users/Bams/.gemini/antigravity/brain/af2e5947-62a7-4201-919c-bcd34a82c913/Blockchain_Performance_Report.xlsx)** berhasil digenerasi dengan format visual yang premium.

### 3. Sinkronisasi Git & GitHub
- Seluruh file perubahan telah di-stage, di-commit, dan didorong ke remote repository di branch `v2`:
```bash
git push origin v2
```
- **Tautan Repository**: `https://github.com/BamsHub/CoffeChain.git`
