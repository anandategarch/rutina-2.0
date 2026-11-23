# Fitur Rutina 2.0 — Aplikasi Mobile

> Rutina 2.0 adalah aplikasi personal untuk mengelola rutinitas dan perkembangan hidup sehari-hari dalam satu tempat: kebiasaan, kebugaran, keuangan, jurnal, dan statistik.

Dokumen ini berfokus pada pengalaman dan fitur **mobile** yang tersedia pada kode aplikasi saat ini. Isinya merupakan dokumentasi fitur yang sudah diimplementasikan, bukan daftar rencana pengembangan.

## Daftar isi

- [Navigasi mobile](#navigasi-mobile)
- [Beranda](#1-beranda--daybook)
- [Kebiasaan](#2-kebiasaan--the-garden)
- [Bugar](#3-bugar--performance-studio)
- [Keuangan](#4-keuangan--the-vault)
- [Jurnal](#5-jurnal--writing-room)
- [Statistik](#6-statistik--the-observatory)
- [Profil dan pengaturan](#7-profil--control-room)
- [Fitur lintas aplikasi](#fitur-lintas-aplikasi)
- [Peta implementasi](#peta-implementasi-di-kode)

## Navigasi mobile

Navigasi bawah mobile menyediakan empat ruang utama:

1. **Beranda** — ringkasan hari ini dan agenda.
2. **Bugar** — aktivitas fisik, asupan, dan data tubuh.
3. **Keuangan** — pencatatan serta pengelolaan uang.
4. **Kebiasaan** — perencanaan dan pemantauan rutinitas.

Tombol **(+) di tengah** membuka Quick Action Hub untuk tindakan yang sering digunakan:

- Tambah kebiasaan.
- Buat catatan jurnal.
- Catat transaksi.
- Catat latihan.
- Catat asupan makanan.
- Isi check-in harian.

Layar **Statistik**, **Jurnal**, dan **Profil** tetap tersedia meskipun bukan tab utama di navigasi bawah. Statistik dapat dibuka dari Beranda dan pintasan eksplorasi, Jurnal dapat dibuka dari header Beranda atau Quick Action Hub, sedangkan Profil dapat dibuka dari avatar Beranda atau Quick Action Hub.

## 1. Beranda — Daybook

Beranda berfungsi sebagai pusat kendali aktivitas harian. Informasi disusun berdasarkan hal yang paling relevan untuk hari ini.

### Progres dan agenda harian

- Sapaan dan tanggal yang mengikuti waktu perangkat.
- Ringkasan jumlah misi yang selesai dibandingkan misi yang dijadwalkan.
- Progres XP dan level.
- Informasi streak atau runtun kebiasaan.
- Kalender ringkas untuk berpindah dan melihat hari.
- Agenda kebiasaan hari ini.
- Penanda misi yang sudah selesai dan misi yang masih perlu dilakukan.
- Akses untuk menambah kebiasaan dan memulihkan kebiasaan dari arsip.

### Sorotan dan motivasi

- **Sorotan Hari Ini** memilih satu hal yang paling relevan untuk diperhatikan, misalnya streak yang perlu dijaga, anggaran yang mendekati batas, tujuan tabungan, atau bonus harian.
- **Rekap Pekan** merangkum perjalanan Senin–Minggu dan membandingkannya dengan pekan sebelumnya pada rentang hari yang sepadan.
- Kartu refleksi berisi kutipan harian yang dapat diganti dan disimpan ke Jurnal.
- Ringkasan aktivitas lintas modul, termasuk latihan dan arus kas.

### Pintasan

- Buka Statistik.
- Buka Jurnal.
- Buka Profil dan pengaturan.
- Tambah aktivitas melalui Quick Action Hub.

## 2. Kebiasaan — The Garden

Ruang untuk membangun rutinitas, menyusun jadwal, dan mengevaluasi konsistensi.

### Membuat dan mengelola kebiasaan

- Membuat kebiasaan baru.
- Menentukan nama, kategori, jadwal, dan waktu pelaksanaan.
- Menambahkan target terukur dengan satuan dan progres bertahap.
- Menyunting, mengarsipkan, memulihkan, atau menghapus kebiasaan.
- Mengatur pengingat pada kebiasaan.
- Mengelompokkan kebiasaan berdasarkan kategori dan jadwal.

### Menjalankan kebiasaan

- Agenda harian yang mengelompokkan kegiatan berdasarkan waktu.
- Check-in untuk menandai kebiasaan selesai.
- Stepper untuk menambah atau mengurangi progres pada kebiasaan terukur.
- **Versi 2 Menit** sebagai bentuk tindakan minimum ketika sulit memulai.
- **Habit Stacking** untuk menghubungkan kebiasaan dengan pemicu, menggunakan pola “Setelah X, saya akan Y”.
- **Hari Jeda / Streak Freeze** untuk memberi ruang istirahat terencana tanpa merusak perhitungan streak sesuai aturan aplikasi.

### Konsistensi dan pendamping kebiasaan

- Runtun saat ini dan runtun terbaik.
- Jumlah penyelesaian dalam pekan berjalan.
- Riwayat status kebiasaan hingga 30 hari, termasuk hari selesai, terlewat, jeda, dan hari tanpa jadwal.
- Tren tingkat penyelesaian per pekan.
- Matriks perbandingan konsistensi empat pekan.
- **Taman Pertumbuhan** yang memvisualisasikan perkembangan kebiasaan melalui lima tahap: Benih, Tunas, Pohon Muda, Pohon Dewasa, dan Berbunga.
- **Saran Coach** untuk mengingatkan kebiasaan yang terlewat dan memberi penyesuaian target berdasarkan pola pekanan (*Goldilocks Nudge*).

### Perpustakaan kebiasaan

- Daftar kebiasaan aktif dan arsip.
- Pencarian berdasarkan nama atau kategori.
- Filter pintar, misalnya kebiasaan konsisten, perlu perhatian, terukur, atau terhubung dengan Bugar.
- Detail kebiasaan untuk melihat progres, jadwal, streak, dan riwayat.

## 3. Bugar — Performance Studio

Ruang pencatatan kebugaran dengan tiga bagian: **Latihan**, **Asupan**, dan **Tubuh**.

### A. Latihan

Jenis aktivitas yang dapat dicatat:

- Lari.
- Jalan.
- Lari + jalan.
- Badminton.
- Latihan beban / barbel.

Kemampuan pencatatan dan pemantauan:

- Mencatat durasi, jarak, pace, kalori, dan detail aktivitas sesuai jenisnya.
- Mencatat sesi latihan beban, gerakan, beban, repetisi, dan set.
- Memilih gerakan dari pustaka latihan dan kelompok otot.
- Menggunakan program latihan yang tersedia.
- Menjalankan sesi latihan dengan tampilan khusus.
- Timer istirahat antarset dengan bunyi hitung mundur.
- Menyimpan atau membatalkan sesi latihan.
- Melihat riwayat aktivitas dan menyaringnya berdasarkan jenis serta rentang tanggal.
- Melihat ringkasan mingguan, jarak kardio, durasi, hari aktif, tonase, dan jumlah sesi.
- Memantau rekor pribadi, termasuk estimasi 1RM (*estimated one-rep max / e1RM*).

### B. Coach Bugar dan alat latihan

- Penilaian kesiapan latihan dari data tidur, nyeri otot, stres, dan energi.
- Saran progresi beban dan repetisi (*double progression*).
- Deteksi plateau dan rekomendasi deload ketika progres beban stagnan.
- Peringatan variasi latihan ketika frekuensi kardio terlalu padat.
- Kalkulator 1RM Epley.
- Kalkulator pemuat piring barbel.
- Tangga pemanasan berdasarkan persentase beban.
- Papan rekor dan keseimbangan kelompok otot.

Saran Coach dihitung dari data yang dicatat pengguna; aplikasi tidak mengklaim mengukur aktivitas tubuh seperti smartwatch.

### C. Asupan

- Mencari makanan dari master data makanan.
- Mencatat makanan, porsi, tanggal, dan kalori.
- Mengisi rincian makro jika tersedia: protein, karbohidrat, dan lemak.
- Melihat total kalori yang dikonsumsi.
- Mengatur target kalori harian.
- Membandingkan asupan dengan target makro.
- Memperhitungkan energi aktivitas pada neraca kalori.
- Melihat tren asupan tujuh hari.
- Membuka jurnal makan pada tanggal yang dipilih.

### D. Tubuh

- Mencatat berat badan.
- Melihat tren berat badan dengan rentang 30, 90, atau 365 hari.
- Menentukan sasaran berat badan.
- Check-in tidur, energi, nyeri otot, dan stres.
- Mencatat hidrasi atau jumlah gelas air.
- Melihat riwayat metrik tubuh dan pemulihan.
- Mengatur sasaran kebugaran seperti durasi, sesi, hidrasi, makro, berat, dan tinggi.

## 4. Keuangan — The Vault

Ruang untuk mencatat arus uang dan mengatur rencana keuangan pribadi.

### Pencatatan transaksi

- Mencatat pemasukan.
- Mencatat pengeluaran.
- Mencatat transfer antar-dompet.
- Mengisi nominal, kategori, dompet, tanggal, dan catatan.
- Mengatur transaksi berulang mingguan atau bulanan.
- Menyunting dan menghapus transaksi.
- Melihat mutasi transaksi yang dikelompokkan per hari.
- Mencari transaksi berdasarkan catatan atau kategori.
- Menyaring daftar mutasi.

### Dompet dan saldo

- Membuat dan mengelola beberapa dompet atau sumber dana.
- Menggunakan dompet untuk uang tunai, rekening, atau e-wallet.
- Melihat saldo masing-masing dompet.
- Melihat arus masuk dan keluar per dompet.
- Melihat detail serta riwayat dompet.

### Anggaran dan tujuan

- Menetapkan batas anggaran bulanan per kategori.
- Melihat nominal terpakai dibanding batas anggaran.
- Mengetahui kategori yang mendekati atau melewati batas.
- Membuat, menyunting, dan memantau tujuan tabungan.
- Mencatat kontribusi ke tujuan tabungan dan melihat progresnya.

### Analisis keuangan

- Ringkasan arus kas berdasarkan periode.
- Grafik pemasukan, pengeluaran, dan saldo bersih.
- Komposisi pengeluaran per kategori.
- Peta panas pengeluaran harian untuk 12 pekan terakhir.
- Ringkasan transaksi terbaru.
- Daftar langganan yang berasal dari transaksi berulang aktif.
- Temuan dan rekomendasi berdasarkan pola transaksi, anggaran, serta perbandingan periode.

## 5. Jurnal — Writing Room

Ruang untuk menulis catatan pribadi dan refleksi.

- Membuat catatan dan draf.
- Menyunting dan membaca catatan.
- Mengatur catatan berdasarkan folder.
- Memberi suasana hati (*mood*) pada catatan.
- Menandai atau menyematkan catatan penting.
- Mencari judul atau isi catatan.
- Menyaring catatan berdasarkan folder, mood, tanggal, dan rentang pekan.
- Melihat kalender aktivitas menulis per bulan.
- Melihat jumlah kata yang ditulis per pekan.
- Melihat distribusi catatan berdasarkan folder dan suasana hati.
- Melanjutkan draf jurnal terakhir dari Beranda.

Jurnal juga menjadi tempat menyimpan kutipan refleksi dari Beranda.

## 6. Statistik — The Observatory

Ruang untuk melihat perkembangan lintas modul berdasarkan data yang sudah dicatat.

### Perkembangan kebiasaan

- Progres XP dan level.
- Runtun terbaik.
- Tren misi selesai berdasarkan periode.
- Perbandingan pekan ini dengan pekan sebelumnya.
- Komposisi kategori kebiasaan.
- Kalender aktivitas bulanan.
- Laporan bulanan dan detail aktivitas pada tanggal tertentu.

### Perkembangan kebugaran dan tubuh

- Ringkasan sesi latihan dan durasinya.
- Ringkasan aktivitas kardio.
- Berat badan terakhir dan tren tubuh.
- Akses menuju detail latihan, asupan, dan tubuh di tab Bugar.

### Wawasan lintas aktivitas

- Kalender yang menandai kebiasaan selesai, transaksi, dan latihan.
- Detail harian untuk menelusuri aktivitas pada tanggal yang dipilih.
- Perbandingan pola aktivitas dan penyelesaian misi.
- Wawasan periode berdasarkan data yang tersedia.

### Suasana hati dan pencapaian

- Check-in suasana hati.
- Riwayat mood 14 hari.
- Distribusi mood yang tercatat.
- Koleksi piala dan lencana pencapaian.
- Ringkasan level dan XP.

Wawasan ditampilkan ketika data mencukupi. Hubungan antar-data disajikan sebagai pola observasi, bukan klaim sebab-akibat.

## 7. Profil — Control Room

Ruang untuk mengatur identitas, preferensi, data, dan bantuan aplikasi.

### Identitas

- Melihat profil pribadi.
- Menulis dan menyunting **Suara Identitas**, yaitu pernyataan tentang pribadi yang ingin dibangun.
- Melihat level pengguna.

### Preferensi aplikasi

- Mengaktifkan mode terang atau gelap.
- Bahasa antarmuka saat ini: Indonesia.
- Melihat jumlah kebiasaan yang menggunakan pengingat.
- Mengatur target misi harian.

### Check-in

- Membuka check-in harian dari Profil.
- Mengisi suasana hati, energi, nyeri otot, stres, dan durasi tidur.
- Isian check-in bersifat opsional.

### Data dan penyimpanan

- Mengekspor cadangan lengkap dalam format JSON.
- Mengekspor transaksi dalam format CSV.
- Memulihkan data dari berkas JSON.
- Menarik ulang snapshot terbaru dari cloud.
- Menghapus seluruh data melalui Zona Kritis.

**Catatan:** impor cadangan JSON mengganti data aplikasi yang sedang digunakan. Pastikan memiliki cadangan sebelum melakukan pemulihan.

### Instalasi dan bantuan

- Memasang Rutina sebagai aplikasi PWA pada perangkat yang mendukung.
- Menjalankan aplikasi dalam tampilan mandiri.
- Mendukung shell offline melalui service worker.
- Membaca FAQ dan informasi tentang Rutina.

## Fitur lintas aplikasi

### Penyimpanan lokal dan sinkronisasi

- State aplikasi disimpan secara lokal pada perangkat.
- Aplikasi menggunakan pola *offline-first*.
- Data disinkronkan ke cloud Turso melalui layanan aplikasi.
- Pengguna dapat meminta penarikan ulang data cloud melalui Profil.
- Preferensi tampilan layar tertentu disimpan secara lokal pada perangkat.

### Pengalaman mobile

- Navigasi bawah yang dirancang untuk penggunaan satu tangan.
- Quick Action Hub untuk mempercepat pencatatan.
- Lembar bawah (*bottom sheet*) dan dialog untuk formulir serta detail.
- Sesi latihan dengan tampilan khusus.
- Tata letak responsif untuk ponsel dan tablet.
- Animasi transisi dan umpan balik interaksi.
- Dukungan aksesibilitas seperti label kontrol dan status yang dapat dibaca teknologi bantu.

### PWA

- Dapat dipasang ke layar utama pada browser/perangkat yang mendukung instalasi PWA.
- Memiliki shell offline untuk membuka antarmuka ketika jaringan tidak tersedia.
- Sinkronisasi cloud memerlukan koneksi jaringan.

## Peta implementasi di kode

Bagian utama aplikasi mobile berada di `src/components/rutina-mobile/`.

| Ruang aplikasi | File layar utama |
|---|---|
| Beranda | `screens/home.tsx` |
| Kebiasaan | `screens/kebiasaan.tsx` |
| Bugar | `screens/bugar.tsx` |
| Keuangan | `screens/keuangan.tsx` |
| Jurnal | `screens/journal.tsx` |
| Statistik | `screens/stats.tsx` |
| Profil | `screens/profile.tsx` |

Komponen pendukung yang penting:

| Area | Lokasi |
|---|---|
| Navigasi bawah mobile | `bottom-nav.tsx` |
| Quick Action Hub | `quick-action-hub.tsx` |
| Penyimpanan state aplikasi | `store.ts` |
| Mesin sinkronisasi | `sync-engine.ts` |
| Check-in harian | `checkin-sheet.tsx` |
| Fitur latihan | `fitness/` |
| Fitur keuangan | `finance/` |
| Service worker PWA | `public/sw.js` |

---

**Ringkasan:** Rutina 2.0 mobile menggabungkan pengelolaan kebiasaan, latihan dan kebugaran, asupan, data tubuh, keuangan, jurnal, dan analisis perkembangan dalam satu aplikasi personal.
