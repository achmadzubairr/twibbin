# Photo Campaign Implementation Guide

## Ringkasan Fitur
Fitur photo campaign memungkinkan user untuk mengupload foto mereka sendiri yang akan ditampilkan dalam bentuk lingkaran di tengah template campaign, sebagai alternatif dari campaign text yang menggunakan input nama dan teks tambahan.

## Files yang Telah Dibuat/Dimodifikasi

### 1. Database Migration
- **File**: `database-migration-campaign-types.sql`
- **Tujuan**: Menambah field `campaign_type` ke tabel campaigns
- **Cara Implementasi**: Jalankan SQL ini di Supabase SQL Editor

### 2. Image Processing Utility
- **File**: `src/utils/imageProcessor.js`
- **Fungsi**:
  - `createCircularImage()`: Membuat gambar lingkaran dari foto user
  - `overlayImageOnTemplate()`: Menggabungkan foto lingkaran dengan template
  - `validateImageFile()`: Validasi file gambar

### 3. Campaign Service Update
- **File**: `src/services/supabaseCampaignService.js`
- **Perubahan**: 
  - Tambah support `campaignType` parameter
  - Update create dan update campaign functions

### 4. Campaign Page Enhancement
- **File**: `src/pages/campaign/CampaignPage.js`
- **Fitur Baru**:
  - UI upload foto untuk photo campaign
  - Preview foto user dalam lingkaran
  - Processing foto dengan canvas manipulation
  - Download image yang sudah digabung

### 5. Admin Panel Update
- **File**: `src/pages/admin/AdminPage.js`
- **Fitur Baru**:
  - Dropdown pilihan tipe campaign (Text/Photo)
  - Indikator tipe campaign di list
  - Penjelasan untuk photo campaign template

## Cara Menggunakan

### Untuk Admin:
1. Jalankan `database-migration-campaign-types.sql` di Supabase
2. Jalankan `fix-rls-policies.sql` jika ada masalah archive (optional)
3. Buat campaign baru dengan memilih "Photo Campaign"
4. Upload template yang akan digunakan sebagai background
5. Foto user akan muncul dalam lingkaran di tengah template

### Untuk User:
1. Akses campaign dengan tipe "photo"
2. Upload foto melalui input file
3. Preview foto akan ditampilkan dalam bentuk lingkaran
4. Klik "Unduh" untuk download hasil gabungan

## Konfigurasi

### Posisi dan Ukuran Foto Lingkaran
Di `CampaignPage.js`, line ~84-89:
```javascript
// Calculate position for center of template
const templateWidth = 1000;
const templateHeight = 1000;
const centerX = templateWidth / 2;  // Posisi X (tengah)
const centerY = templateHeight / 2; // Posisi Y (tengah)
const circleSize = 300;             // Diameter lingkaran
```

### Validasi File
Di `imageProcessor.js`:
- Maksimal ukuran file: 5MB
- Format yang diterima: semua format gambar
- Validasi dapat diubah sesuai kebutuhan

## Testing
Untuk test fitur ini:
1. Buat campaign baru dengan tipe "Photo"
2. Upload template yang sesuai
3. Akses campaign melalui slug
4. Upload foto dan pastikan preview muncul
5. Download dan cek hasil akhir

## Troubleshooting

### Foto tidak muncul di tengah template
- Sesuaikan nilai `centerX`, `centerY`, dan `circleSize` 
- Pastikan template memiliki area kosong di tengah

### Error saat upload foto
- Cek console browser untuk error details
- Pastikan file size tidak melebihi 5MB
- Pastikan format file adalah gambar valid

### RLS Policy Error
- Jalankan `fix-rls-policies.sql` jika belum dijalankan
- Pastikan policies mengizinkan operasi CRUD

## Next Steps
- Bisa ditambahkan fitur drag-and-drop untuk upload foto
- Opsi untuk adjust posisi dan ukuran foto lingkaran
- Multiple foto slots dalam satu template
- Crop tool untuk user sebelum processing