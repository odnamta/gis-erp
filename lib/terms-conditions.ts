/**
 * Terms & Conditions Module
 * 
 * Manages T&C content and version for GAMA ERP.
 * Update TERMS_VERSION to force all users to re-accept terms.
 */

/**
 * Current version of Terms & Conditions
 * Update this value to require all users to re-accept terms
 */
export const TERMS_VERSION = '1.0.0'

/**
 * Check if user has accepted the current version of Terms & Conditions
 * 
 * @param tcAcceptedAt - Timestamp when user accepted T&C (ISO string or null)
 * @param tcVersion - Version of T&C that user accepted (or null)
 * @returns true if user has accepted the current TERMS_VERSION
 */
export function hasAcceptedCurrentTerms(
  tcAcceptedAt: string | null,
  tcVersion: string | null
): boolean {
  // User must have both a timestamp and a version
  if (!tcAcceptedAt || !tcVersion) {
    return false
  }
  
  // Version must match current TERMS_VERSION
  return tcVersion === TERMS_VERSION
}

/**
 * Terms & Conditions content in markdown format
 * Contains all 10 required sections for legal compliance
 */
export const TERMS_CONTENT = `# Syarat dan Ketentuan Penggunaan Sistem GAMA ERP

**PT. Gama Intisamudera**

*Versi ${TERMS_VERSION} - Berlaku sejak Januari 2026*

---

## 1. Penerimaan Syarat dan Ketentuan

Dengan mengakses dan menggunakan sistem GAMA ERP ("Sistem"), Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat dengan Syarat dan Ketentuan ini. Jika Anda tidak menyetujui syarat dan ketentuan ini, Anda tidak diperkenankan untuk menggunakan Sistem.

Penggunaan Sistem ini merupakan bentuk persetujuan Anda terhadap seluruh ketentuan yang tercantum dalam dokumen ini. Persetujuan ini berlaku efektif sejak Anda pertama kali mengakses Sistem setelah menerima syarat dan ketentuan ini.

---

## 2. Penggunaan yang Diizinkan

Sistem GAMA ERP ini disediakan **khusus untuk karyawan PT. Gama Intisamudera** yang telah mendapatkan otorisasi akses. Penggunaan Sistem dibatasi untuk:

- Karyawan aktif PT. Gama Intisamudera dengan akun yang valid
- Keperluan operasional bisnis perusahaan
- Fungsi dan fitur sesuai dengan peran (role) yang ditetapkan
- Akses data sesuai dengan tingkat otorisasi yang diberikan

Setiap penggunaan di luar ketentuan di atas dianggap sebagai pelanggaran dan dapat dikenakan sanksi sesuai peraturan perusahaan.

---

## 3. Tanggung Jawab Pengguna

Sebagai pengguna Sistem, Anda bertanggung jawab untuk:

### Keamanan Kredensial
- Menjaga kerahasiaan username dan password Anda
- Tidak membagikan kredensial login kepada siapapun
- Segera melaporkan jika terjadi kebocoran atau penyalahgunaan akun

### Prosedur Logout
- Selalu melakukan logout setelah selesai menggunakan Sistem
- Tidak meninggalkan sesi aktif tanpa pengawasan
- Menggunakan fitur "Remember Me" dengan bijak

### Penggunaan untuk Keperluan Bisnis
- Menggunakan Sistem hanya untuk keperluan pekerjaan
- Tidak menggunakan Sistem untuk kepentingan pribadi
- Memastikan setiap transaksi dan data yang diinput adalah akurat dan valid

---

## 4. Penanganan Data

### Kepemilikan Data
Seluruh data yang tersimpan dalam Sistem merupakan **milik PT. Gama Intisamudera**. Data ini mencakup namun tidak terbatas pada:

- Data pelanggan dan vendor
- Data transaksi dan keuangan
- Data operasional dan logistik
- Data karyawan dan SDM
- Dokumen dan lampiran digital

### Kerahasiaan
Anda wajib menjaga kerahasiaan seluruh data perusahaan yang dapat diakses melalui Sistem. Informasi yang bersifat rahasia tidak boleh dibagikan kepada pihak yang tidak berwenang, baik internal maupun eksternal perusahaan.

### Integritas Data
Anda bertanggung jawab untuk memastikan keakuratan data yang Anda input ke dalam Sistem. Manipulasi atau pemalsuan data merupakan pelanggaran serius.

---

## 5. Tindakan yang Dilarang

Pengguna **dilarang keras** untuk melakukan hal-hal berikut:

### Akses Tidak Sah
- Mengakses data atau fitur di luar otorisasi yang diberikan
- Mencoba menembus sistem keamanan atau batasan akses
- Menggunakan akun pengguna lain tanpa izin

### Pembagian Data
- Membagikan data perusahaan kepada pihak eksternal tanpa otorisasi
- Mengunduh data dalam jumlah besar untuk keperluan di luar pekerjaan
- Mengirimkan informasi rahasia melalui saluran yang tidak aman

### Aktivitas Berbahaya
- Menginstal atau menjalankan malware atau program berbahaya
- Melakukan serangan terhadap infrastruktur Sistem
- Merusak atau menghapus data secara sengaja

Pelanggaran terhadap ketentuan ini dapat mengakibatkan pencabutan akses dan tindakan disipliner sesuai peraturan perusahaan.

---

## 6. Ketersediaan Sistem

### Layanan "As-Is"
Sistem GAMA ERP disediakan dalam kondisi "sebagaimana adanya" (as-is). PT. Gama Intisamudera berupaya untuk menjaga ketersediaan Sistem, namun tidak menjamin bahwa Sistem akan selalu tersedia tanpa gangguan.

### Pemeliharaan Terjadwal
- Pemeliharaan rutin akan dilakukan secara berkala
- Pemberitahuan akan diberikan sebelum pemeliharaan terjadwal
- Selama pemeliharaan, akses ke Sistem mungkin terbatas atau tidak tersedia

### Gangguan Tidak Terduga
Dalam hal terjadi gangguan tidak terduga, tim IT akan berupaya memulihkan layanan secepat mungkin. Pengguna diharapkan untuk bersabar dan tidak melakukan tindakan yang dapat memperburuk situasi.

---

## 7. Pemantauan dan Keamanan

### Pencatatan Aktivitas
Seluruh aktivitas pengguna dalam Sistem **dicatat dan dipantau** untuk keperluan:

- Audit keamanan dan kepatuhan
- Investigasi insiden
- Analisis penggunaan sistem
- Peningkatan layanan

### Log yang Dicatat
Sistem mencatat informasi berikut:
- Waktu login dan logout
- Halaman yang diakses
- Transaksi yang dilakukan
- Perubahan data
- Alamat IP dan informasi perangkat

### Penggunaan Data Log
Data log dapat digunakan oleh manajemen dan tim IT untuk memastikan keamanan dan kepatuhan terhadap kebijakan perusahaan.

---

## 8. Penghentian Akses

PT. Gama Intisamudera berhak untuk **mencabut akses pengguna** kapan saja dengan atau tanpa pemberitahuan sebelumnya, dalam kondisi berikut:

- Pelanggaran terhadap Syarat dan Ketentuan ini
- Berakhirnya hubungan kerja dengan perusahaan
- Perubahan peran atau tanggung jawab yang tidak memerlukan akses Sistem
- Permintaan dari atasan atau manajemen
- Alasan keamanan atau investigasi

Setelah pencabutan akses, pengguna tidak lagi diperkenankan untuk mengakses Sistem dan wajib mengembalikan seluruh aset terkait.

---

## 9. Pembaruan Syarat dan Ketentuan

### Hak untuk Memperbarui
PT. Gama Intisamudera berhak untuk memperbarui Syarat dan Ketentuan ini sewaktu-waktu. Pembaruan dapat mencakup:

- Perubahan kebijakan perusahaan
- Penyesuaian dengan regulasi yang berlaku
- Penambahan fitur atau layanan baru
- Perbaikan dan klarifikasi ketentuan

### Pemberitahuan Pembaruan
Pengguna akan diberitahu mengenai pembaruan Syarat dan Ketentuan melalui:

- Notifikasi dalam Sistem
- Permintaan persetujuan ulang saat login

### Persetujuan Ulang
Setelah pembaruan, pengguna **wajib menyetujui ulang** Syarat dan Ketentuan yang baru sebelum dapat melanjutkan penggunaan Sistem.

---

## 10. Kontak

Untuk pertanyaan, masukan, atau pelaporan terkait Syarat dan Ketentuan ini atau penggunaan Sistem GAMA ERP, silakan hubungi:

**Departemen IT - PT. Gama Intisamudera**

- Email: it@gamaintisamudera.com
- Telepon: (021) 123-4567
- Jam Operasional: Senin - Jumat, 08:00 - 17:00 WIB

Untuk pelaporan insiden keamanan atau penyalahgunaan sistem, harap segera menghubungi tim IT melalui saluran di atas.

---

*Dengan menerima Syarat dan Ketentuan ini, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum di atas.*

**PT. Gama Intisamudera © 2026**
`
