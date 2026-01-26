-- Migration: Insert FAQ Content for Help Center Enhancement (v0.38.1)
-- This migration populates the help_faqs table with comprehensive Indonesian FAQ content

-- Getting Started FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Bagaimana cara login ke sistem?',
  'Buka halaman login di /login, masukkan email dan password Anda, lalu klik tombol "Masuk". Pastikan menggunakan email yang sudah terdaftar di sistem.',
  'getting_started',
  '{}',
  1
),
(
  'Bagaimana cara navigasi di sistem?',
  'Gunakan sidebar di sebelah kiri untuk mengakses menu utama. Klik pada menu yang diinginkan untuk membuka halaman tersebut. Anda juga bisa menggunakan fitur pencarian global dengan menekan Ctrl+K.',
  'getting_started',
  '{}',
  2
),
(
  'Bagaimana cara mengubah password?',
  'Klik pada avatar Anda di pojok kanan atas, pilih "Settings", lalu pilih tab "Security". Di sana Anda bisa mengubah password dengan memasukkan password lama dan password baru.',
  'getting_started',
  '{}',
  3
),
(
  'Apa saja fitur utama sistem ini?',
  'Sistem ini mencakup modul: Quotation, Proforma JO, Job Order, Invoice, Pembayaran, BKK, HR (Karyawan, Cuti, Payroll), Equipment, HSE, Customs, dan Reports. Akses ke setiap modul tergantung pada role Anda.',
  'getting_started',
  '{}',
  4
),
(
  'Bagaimana cara melihat notifikasi?',
  'Klik ikon lonceng di pojok kanan atas untuk melihat notifikasi terbaru. Notifikasi yang belum dibaca akan ditandai dengan badge merah. Klik pada notifikasi untuk melihat detailnya.',
  'getting_started',
  '{}',
  5
);

-- Quotations FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Bagaimana cara membuat quotation baru?',
  'Buka menu Quotations, klik tombol "Buat Quotation Baru". Isi data pelanggan, detail cargo, origin-destination, dan estimasi biaya. Setelah selesai, klik "Simpan" untuk menyimpan sebagai draft atau "Submit" untuk mengirim ke review.',
  'quotations',
  '{"marketing", "marketing_manager", "administration", "owner", "director"}',
  1
),
(
  'Bagaimana cara mengedit quotation?',
  'Buka quotation yang ingin diedit dari daftar quotation. Klik tombol "Edit" di pojok kanan atas. Lakukan perubahan yang diperlukan, lalu klik "Simpan". Quotation yang sudah submitted tidak bisa diedit.',
  'quotations',
  '{"marketing", "marketing_manager", "administration", "owner", "director"}',
  2
),
(
  'Apa itu engineering review pada quotation?',
  'Engineering review adalah proses evaluasi teknis untuk quotation yang memerlukan assessment khusus, seperti cargo berat, rute baru, atau kondisi khusus. Tim engineering akan mengevaluasi kelayakan dan memberikan rekomendasi.',
  'quotations',
  '{"marketing", "marketing_manager", "engineer", "owner", "director"}',
  3
),
(
  'Bagaimana cara mengkonversi quotation ke PJO?',
  'Setelah quotation disetujui (status "Won"), buka detail quotation dan klik tombol "Convert to PJO". Data dari quotation akan otomatis ter-copy ke PJO baru. Review dan lengkapi data yang diperlukan.',
  'quotations',
  '{"marketing", "marketing_manager", "administration", "owner", "director"}',
  4
);

-- Job Orders FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Bagaimana cara membuat PJO baru?',
  'Buka menu Proforma JO, klik "Buat PJO Baru". Isi data pelanggan, project, detail cargo, dan estimasi biaya. Setelah selesai, submit untuk approval. PJO yang disetujui bisa dikonversi menjadi Job Order.',
  'jobs',
  '{"administration", "marketing", "marketing_manager", "ops", "operations_manager", "owner", "director"}',
  1
),
(
  'Bagaimana cara mengisi biaya aktual di Job Order?',
  'Buka Job Order yang aktif, scroll ke bagian "Cost Items". Klik pada item biaya yang ingin diisi, masukkan nilai aktual, dan simpan. Pastikan semua biaya terisi sebelum menyelesaikan Job Order.',
  'jobs',
  '{"ops", "operations_manager", "finance", "finance_manager", "owner", "director"}',
  2
),
(
  'Apa perbedaan PJO dan Job Order?',
  'PJO (Proforma Job Order) adalah perencanaan pekerjaan dengan estimasi biaya. Setelah PJO disetujui dan pekerjaan dimulai, PJO dikonversi menjadi Job Order untuk tracking biaya aktual dan progress pekerjaan.',
  'jobs',
  '{}',
  3
),
(
  'Bagaimana alur approval PJO?',
  'PJO dibuat oleh staff → Submit untuk review → Checker melakukan pengecekan → Approver memberikan approval → PJO siap dikonversi ke Job Order. Jika ditolak, PJO dikembalikan untuk revisi.',
  'jobs',
  '{}',
  4
),
(
  'Bagaimana cara menyelesaikan Job Order?',
  'Pastikan semua biaya aktual sudah terisi dan dokumen pendukung sudah lengkap. Klik tombol "Complete Job Order". Setelah selesai, Job Order bisa di-submit ke Finance untuk pembuatan invoice.',
  'jobs',
  '{"ops", "operations_manager", "finance", "finance_manager", "owner", "director"}',
  5
);

-- Finance FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Bagaimana cara membuat invoice?',
  'Buka Job Order yang sudah selesai dan di-submit ke Finance. Klik tombol "Buat Invoice", pilih term pembayaran, dan review detail invoice. Klik "Generate" untuk membuat invoice.',
  'finance',
  '{"finance", "finance_manager", "owner", "director"}',
  1
),
(
  'Bagaimana cara mencatat pembayaran?',
  'Buka invoice yang ingin dicatat pembayarannya. Klik "Record Payment", masukkan jumlah pembayaran, tanggal, dan metode pembayaran. Klik "Simpan" untuk mencatat pembayaran.',
  'finance',
  '{"finance", "finance_manager", "owner", "director"}',
  2
),
(
  'Apa itu BKK (Bukti Kas Keluar)?',
  'BKK adalah dokumen pencatatan pengeluaran kas perusahaan. BKK dibuat untuk setiap pembayaran ke vendor atau pengeluaran operasional. BKK memerlukan approval sebelum pembayaran dilakukan.',
  'finance',
  '{}',
  3
),
(
  'Bagaimana cara melihat outstanding invoice?',
  'Buka menu Invoices, gunakan filter "Status" dan pilih "Sent" atau "Overdue" untuk melihat invoice yang belum dibayar. Anda juga bisa melihat ringkasan di dashboard Finance.',
  'finance',
  '{"finance", "finance_manager", "owner", "director"}',
  4
),
(
  'Bagaimana cara split invoice?',
  'Buka Job Order, pada bagian Invoice Terms, tambahkan multiple terms (misalnya 50% DP, 50% pelunasan). Setiap term akan menghasilkan invoice terpisah sesuai persentase yang ditentukan.',
  'finance',
  '{"finance", "finance_manager", "owner", "director"}',
  5
);

-- HR FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Bagaimana cara mengajukan cuti?',
  'Buka menu HR > Leave Request, klik "Ajukan Cuti". Pilih jenis cuti, tanggal mulai dan selesai, serta alasan cuti. Submit pengajuan untuk approval atasan.',
  'hr',
  '{}',
  1
),
(
  'Bagaimana cara melihat slip gaji?',
  'Buka menu HR > Payroll, pilih periode gaji yang ingin dilihat. Klik pada nama Anda untuk melihat detail slip gaji. Anda juga bisa download slip gaji dalam format PDF.',
  'hr',
  '{}',
  2
),
(
  'Bagaimana cara clock in/out?',
  'Buka menu HR > Attendance, klik tombol "Clock In" saat mulai bekerja dan "Clock Out" saat selesai. Sistem akan mencatat waktu dan lokasi Anda secara otomatis.',
  'hr',
  '{}',
  3
),
(
  'Bagaimana cara melihat saldo cuti?',
  'Buka menu HR > Leave Balance untuk melihat sisa cuti Anda. Informasi ini juga ditampilkan di dashboard HR dan saat mengajukan cuti baru.',
  'hr',
  '{}',
  4
);

-- Reports FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Bagaimana cara generate laporan?',
  'Buka menu Reports, pilih jenis laporan yang diinginkan. Tentukan periode dan filter yang diperlukan, lalu klik "Generate Report". Laporan akan ditampilkan di layar.',
  'reports',
  '{"finance", "finance_manager", "marketing_manager", "operations_manager", "owner", "director"}',
  1
),
(
  'Bagaimana cara export laporan ke PDF/Excel?',
  'Setelah laporan di-generate, klik tombol "Export" di pojok kanan atas. Pilih format yang diinginkan (PDF atau Excel). File akan otomatis ter-download.',
  'reports',
  '{"finance", "finance_manager", "marketing_manager", "operations_manager", "owner", "director"}',
  2
),
(
  'Laporan apa saja yang tersedia?',
  'Sistem menyediakan berbagai laporan: Revenue Report, Cost Analysis, Job Order Summary, Invoice Aging, Employee Attendance, Leave Summary, Equipment Utilization, dan lainnya. Akses tergantung pada role Anda.',
  'reports',
  '{}',
  3
);

-- Troubleshooting FAQs
INSERT INTO help_faqs (question, answer, category, applicable_roles, display_order) VALUES
(
  'Sistem terasa lambat, apa yang harus dilakukan?',
  'Coba refresh halaman dengan menekan Ctrl+R atau F5. Jika masih lambat, clear browser cache (Ctrl+Shift+Delete), atau coba gunakan browser lain. Pastikan koneksi internet Anda stabil.',
  'troubleshooting',
  '{}',
  1
),
(
  'Bagaimana cara melaporkan bug?',
  'Gunakan tombol Feedback di pojok kanan bawah halaman. Jelaskan masalah yang ditemukan, sertakan screenshot jika memungkinkan, dan langkah-langkah untuk mereproduksi masalah.',
  'troubleshooting',
  '{}',
  2
),
(
  'Data tidak muncul, apa yang harus dilakukan?',
  'Pastikan Anda memiliki akses ke data tersebut (cek role Anda). Coba refresh halaman. Jika masih tidak muncul, hubungi administrator untuk memverifikasi permission Anda.',
  'troubleshooting',
  '{}',
  3
),
(
  'Bagaimana cara clear cache browser?',
  'Tekan Ctrl+Shift+Delete untuk membuka menu clear cache. Pilih "Cached images and files" dan klik "Clear data". Setelah itu, refresh halaman dengan Ctrl+R.',
  'troubleshooting',
  '{}',
  4
),
(
  'Saya tidak bisa mengakses menu tertentu, kenapa?',
  'Akses menu ditentukan oleh role Anda di sistem. Jika Anda merasa seharusnya memiliki akses, hubungi administrator atau ajukan request akses melalui menu Settings > Request Access.',
  'troubleshooting',
  '{}',
  5
);
