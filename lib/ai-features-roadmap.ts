export interface AIFeatureRoadmapItem {
  id: string
  name: string
  description: string
  category: 'pjo' | 'invoice' | 'bkk' | 'dashboard'
  complexity: 'medium' | 'high' | 'very_high'
  prerequisites: string[]
  status: 'parked'
}

export const AI_FEATURE_ROADMAP: AIFeatureRoadmapItem[] = [
  {
    id: 'ai-smart-auto-jo',
    name: 'AI Smart Auto Job Order Creation',
    description: 'Otomatis membuat Job Order dari data PJO yang sudah disetujui, mengisi field berdasarkan pola historis dan preferensi customer. Termasuk prediksi carrier type, estimasi timeline, dan auto-assign ke tim operasional.',
    category: 'pjo',
    complexity: 'high',
    prerequisites: [
      'Minimal 100 PJO historis untuk training',
      'ML pipeline (model training + inference)',
      'Feature store untuk customer preferences',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-autofill',
    name: 'AI Smart Customer & Shipment Data Autofill',
    description: 'Secara otomatis mengisi data customer dan shipment berdasarkan pola pengiriman sebelumnya. Mempelajari preferensi customer seperti commodity, quantity unit, carrier type yang sering digunakan.',
    category: 'pjo',
    complexity: 'medium',
    prerequisites: [
      'Customer behavior analytics',
      'Recommendation engine',
      'Minimal 50 transaksi per customer untuk akurasi',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-pol-pod',
    name: 'AI Smart POL & POD Auto Location',
    description: 'Prediksi dan auto-suggest lokasi POL/POD berdasarkan histori customer, termasuk koreksi otomatis untuk typo dan normalisasi alamat. Integrasi dengan geocoding API untuk validasi.',
    category: 'pjo',
    complexity: 'medium',
    prerequisites: [
      'Address normalization service',
      'Geocoding API integration',
      'Location database dengan fuzzy matching',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-route-prediction',
    name: 'AI Smart Route & Distance Prediction',
    description: 'Prediksi rute optimal dan jarak tempuh berdasarkan POL/POD, termasuk estimasi waktu tempuh, identifikasi jalan yang tidak bisa dilalui heavy-haul, dan rekomendasi rute alternatif.',
    category: 'pjo',
    complexity: 'very_high',
    prerequisites: [
      'Road network data Indonesia',
      'Heavy-haul route restriction database',
      'Real-time traffic API',
      'Route optimization algorithm',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-invoice-generator',
    name: 'AI Smart Invoice Generator',
    description: 'Otomatis generate invoice dengan line items yang optimal berdasarkan JO, termasuk pengelompokan biaya, auto-split termin pembayaran, dan rekomendasi diskon berdasarkan payment history customer.',
    category: 'invoice',
    complexity: 'high',
    prerequisites: [
      'Invoice pattern analysis',
      'Customer payment history analytics',
      'Rule engine untuk pengelompokan biaya',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-invoice-validation',
    name: 'AI Smart Invoice Validation & Error Detection',
    description: 'Deteksi anomali pada invoice sebelum dikirim: jumlah yang tidak wajar, line item yang mungkin terlewat, perhitungan PPN yang salah, dan ketidaksesuaian dengan kontrak customer.',
    category: 'invoice',
    complexity: 'high',
    prerequisites: [
      'Anomaly detection model',
      'Contract compliance checker',
      'Historical invoice baseline data',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-charge-prediction',
    name: 'AI Smart Charge Prediction',
    description: 'Prediksi biaya pengiriman berdasarkan rute, berat, dimensi, dan kondisi pasar saat ini. Termasuk prediksi biaya BBM, tol, dan biaya operasional lainnya.',
    category: 'pjo',
    complexity: 'very_high',
    prerequisites: [
      'Cost model training dari data historis',
      'Real-time fuel price API',
      'Toll rate database',
      'Market condition indicators',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-duplicate-invoice',
    name: 'AI Smart Duplicate Invoice Detection',
    description: 'Deteksi duplikat invoice menggunakan ML yang lebih canggih dari rule-based: mengenali pattern duplikasi yang kompleks termasuk partial duplicates, split invoice yang overlap, dan cross-JO duplications.',
    category: 'invoice',
    complexity: 'high',
    prerequisites: [
      'NLP untuk comparison deskripsi',
      'Graph database untuk relasi JO-Invoice',
      'Duplicate detection ML model',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-invoice-classification',
    name: 'AI Smart Invoice Classification',
    description: 'Otomatis klasifikasi invoice berdasarkan tipe layanan, urgensi, dan prioritas pembayaran. Membantu finance team dalam prioritisasi follow-up dan collection.',
    category: 'invoice',
    complexity: 'medium',
    prerequisites: [
      'Classification model',
      'Feature engineering dari invoice metadata',
      'Priority scoring algorithm',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-ocr-invoice',
    name: 'AI Smart OCR Invoice Reader',
    description: 'Membaca invoice vendor yang diterima dalam bentuk PDF/foto, mengekstrak data (nomor invoice, jumlah, tanggal, item) dan otomatis membuat vendor invoice di sistem.',
    category: 'invoice',
    complexity: 'very_high',
    prerequisites: [
      'OCR engine (Tesseract atau cloud OCR)',
      'Document layout analysis model',
      'Named entity recognition untuk invoice fields',
      'Template matching untuk berbagai format vendor',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-invoice-approval',
    name: 'AI Smart Invoice Approval Workflow',
    description: 'Rekomendasi approval otomatis untuk invoice berdasarkan pattern: auto-approve untuk invoice rutin yang sesuai kontrak, flag untuk review manual jika ada anomali.',
    category: 'invoice',
    complexity: 'high',
    prerequisites: [
      'Approval pattern learning',
      'Risk scoring model',
      'Integration dengan workflow engine',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-payment-prediction',
    name: 'AI Smart Payment Prediction',
    description: 'Prediksi kapan customer akan membayar invoice berdasarkan payment history, profil customer, dan faktor eksternal. Membantu cash flow forecasting.',
    category: 'invoice',
    complexity: 'high',
    prerequisites: [
      'Payment behavior model',
      'Time series forecasting',
      'Customer credit scoring',
      'Minimal 6 bulan payment history',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-revenue-leakage',
    name: 'AI Smart Revenue Leakage Detection',
    description: 'Deteksi potensi kebocoran pendapatan: biaya yang tidak ditagihkan, charge yang terlewat, diskon yang tidak seharusnya diberikan, dan perbedaan antara kontrak dengan actual billing.',
    category: 'invoice',
    complexity: 'very_high',
    prerequisites: [
      'Contract parsing engine',
      'Revenue reconciliation model',
      'Anomaly detection untuk billing gaps',
      'Complete contract digitization',
    ],
    status: 'parked',
  },
  {
    id: 'ai-smart-jo-classification',
    name: 'AI Smart Job Order Classification',
    description: 'Klasifikasi otomatis JO berdasarkan kompleksitas, risiko, dan kebutuhan resources. Membantu operations manager dalam alokasi tim dan perencanaan kapasitas.',
    category: 'pjo',
    complexity: 'high',
    prerequisites: [
      'JO outcome data (success/failure/delay)',
      'Resource utilization data',
      'Multi-label classification model',
    ],
    status: 'parked',
  },
  {
    id: 'ai-dashboard-bkk-pjo',
    name: 'AI Dashboard Features for BKK & PJO',
    description: 'Dashboard analytics berbasis AI: trend analysis untuk BKK disbursements, prediksi budget overrun, PJO profitability forecasting, dan anomaly alerting untuk pengeluaran tidak wajar.',
    category: 'dashboard',
    complexity: 'very_high',
    prerequisites: [
      'Time series analysis pipeline',
      'Anomaly detection for financial data',
      'Forecasting models (ARIMA/Prophet)',
      'Real-time alerting infrastructure',
      'Minimal 12 bulan data historis',
    ],
    status: 'parked',
  },
]
