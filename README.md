# Twibbin - Custom Greeting Card Generator

**Aplikasi generator kartu ucapan kustom untuk STIBA Makassar**

Dibuat oleh [@zavierferodova](https://github.com/zavierferodova) dan dikembangkan oleh [@achmadzubairr](https://github.com/achmadzubairr)

## 📋 Deskripsi

Twibbin adalah aplikasi web React yang memungkinkan pengguna membuat kartu ucapan kustom dengan dua mode:
- **Text Campaign**: Input nama dan teks tambahan pada template
- **Photo Campaign**: Upload foto dengan editor posisi drag & zoom

## ✨ Fitur Utama

### 🎨 Campaign Management
- **Dual Campaign Types**: Text dan Photo campaigns
- **Admin Panel**: CRUD operations untuk campaign
- **Template Upload**: Support gambar dengan preview
- **Active/Inactive Status**: Toggle aktivasi campaign
- **Soft Delete**: Archive campaign tanpa menghapus data

### 📸 Photo Editor (Photo Campaign)
- **Touch Gestures**: Drag untuk reposisi, pinch untuk zoom
- **Desktop Support**: Mouse drag + scroll wheel zoom
- **Real-time Preview**: WYSIWYG editing experience
- **Mobile Optimized**: Responsive touch controls
- **Object-contain Rendering**: Foto tidak terpotong, tetap proporsional

### 📊 Analytics & Tracking
- **Download Tracking**: Log setiap download dengan metadata
- **Campaign Analytics**: Statistics per campaign
- **User Analytics**: Top names, unique users
- **Download History**: Recent downloads dengan detail
- **CSV Export**: Export data analytics

### 🚀 Sharing Features
- **Social Media Integration**: WhatsApp, Telegram, Facebook, Instagram, X (Twitter)
- **Copy Link**: One-click link copying
- **Dynamic Meta Tags**: Optimized untuk social media preview
- **Mobile-first Design**: Touch-optimized buttons

### 🧭 Navigation Features
- **Logo Navigation**: Klik logo atau teks "STIBA Makassar" untuk ke home
- **Clean UI**: Removed redundant "Beranda" buttons for cleaner interface
- **Responsive Header**: Consistent navigation across all pages

### 🎯 Technical Features
- **Responsive Design**: Mobile-first dengan Tailwind CSS
- **Performance Optimized**: Image processing dan caching
- **SEO Ready**: Dynamic meta tags untuk sharing
- **Cloud Storage**: Cloudinary integration untuk template images
- **Database**: Supabase PostgreSQL dengan RLS

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **HTML2Canvas** - Screenshot generation
- **TypeScript** - Type safety (utilities)

### Backend & Services
- **Supabase** - Database, Authentication, Storage
- **Cloudinary** - Image optimization dan CDN
- **Vercel Analytics** - Performance tracking

### Key Libraries
- `@supabase/supabase-js` - Database integration
- `html2canvas` - Image generation
- `react-router-dom` - Client-side routing
- `cloudinary` - Image management

## 📁 Project Structure

```
src/
├── components/           # Reusable components
│   ├── PhotoEditor.js   # Photo editing dengan touch gestures
│   └── ProtectedRoute.js # Route protection
├── config/              # Configuration files
│   ├── cloudinary.js    # Cloudinary setup
│   └── supabase.js      # Supabase client
├── pages/               # Page components
│   ├── admin/           
│   │   └── AdminPage.js # Admin panel
│   ├── campaign/        
│   │   └── CampaignPage.js # Main campaign page
│   ├── home/            
│   │   └── HomePage.js  # Landing page
│   └── index.js         # Page exports
├── services/            # API services
│   ├── adminService.js           # Admin authentication & settings
│   ├── downloadService.js        # Download tracking & analytics
│   └── supabaseCampaignService.js # Campaign CRUD operations
├── utils/               # Utility functions
│   ├── component-handler.ts # Form handlers
│   └── imageProcessor.js    # Image processing
├── images/              # Static assets
└── App.js              # Main app component
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ dan npm/yarn
- Account Supabase
- Account Cloudinary (optional)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/twibbin.git
cd twibbin
npm install
```

### 2. Environment Variables
Buat file `.env.local`:
```env
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
REACT_APP_CLOUDINARY_API_KEY=your-cloudinary-api-key
REACT_APP_CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 3. Database Setup
Jalankan SQL script `database-complete-setup.sql` di Supabase SQL Editor.

File ini berisi semua setup database yang diperlukan termasuk:
- **Extensions**: UUID generator
- **Tables**: campaigns, downloads, admin_settings
- **Indexes**: Optimized untuk performance 
- **Triggers**: Auto-update timestamps
- **Views**: Analytics dan soft-deleted campaigns
- **Functions**: Utility functions untuk analytics dan soft delete
- **RLS Policies**: Row level security
- **Sample Data**: Optional untuk testing

```bash
# Copy dan paste isi file database-complete-setup.sql ke Supabase SQL Editor
cat database-complete-setup.sql
```

**Catatan**: Semua file SQL sebelumnya telah dikonsolidasi ke dalam `database-complete-setup.sql`

### 4. Cloudinary Setup (Optional)
1. Daftar di [Cloudinary](https://cloudinary.com/)
2. Copy Cloud Name, API Key, dan API Secret
3. Buat folder \"twibbin\" di Media Library

### 5. Supabase Storage Setup
1. Buka Supabase Dashboard → Storage
2. Buat bucket \"templates\" dengan Public access
3. Upload test template images

### 6. Development Server
```bash
npm start
```
Aplikasi akan berjalan di http://localhost:3000

## 📚 Usage Guide

### Untuk Admin

#### 1. Akses Admin Panel
- Buka `/admin`
- Masukkan password admin (tersimpan di database `admin_settings` table)

#### 2. Membuat Campaign
1. Pilih tab \"Buat Campaign\"
2. Pilih tipe: Text atau Photo
3. Input nama campaign
4. Slug akan auto-generate atau edit manual
5. Upload template image
6. Klik \"Buat Campaign\"

#### 3. Mengelola Campaign
- **Edit**: Ubah nama, slug, atau template
- **Toggle Status**: Aktifkan/nonaktifkan campaign
- **Archive**: Soft delete campaign
- **View**: Preview campaign di tab baru

#### 4. Analytics
- **Overview**: Total downloads, statistik harian/mingguan
- **Campaign Performance**: Analytics per campaign
- **Downloads**: Recent downloads dengan detail user
- **Export**: Download data dalam format CSV

### Untuk User

#### Navigasi
- **Home**: Klik logo atau teks "STIBA Makassar" di header untuk kembali ke beranda
- **Admin**: Klik link "Admin" di header untuk akses admin panel

#### Text Campaign
1. Pilih template di homepage atau akses langsung via URL slug
2. Input nama (maksimal 25 karakter)
3. Input teks tambahan (opsional, maksimal 25 karakter)
4. Klik "Unduh" untuk download

#### Photo Campaign
1. Pilih template photo campaign
2. Upload foto (maksimal 5MB)
3. Atur posisi foto:
   - **Mobile**: Drag untuk geser, pinch untuk zoom
   - **Desktop**: Drag dengan mouse, scroll untuk zoom
4. Klik "Unduh Gambar" ketika posisi sudah sesuai

#### Sharing
- Gunakan tombol social media di bawah template
- WhatsApp, Telegram, Facebook, Instagram, X (Twitter)
- Copy Link untuk sharing manual

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL | ✅ |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `REACT_APP_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ⚪ |
| `REACT_APP_CLOUDINARY_API_KEY` | Cloudinary API key | ⚪ |
| `REACT_APP_CLOUDINARY_API_SECRET` | Cloudinary API secret | ⚪ |

### Customization

#### 1. Ganti Branding
- Edit `src/images/in-logo.png` untuk logo
- Update title di `public/index.html`
- Ubah nama di navigation components

#### 2. Styling
- Main colors di `tailwind.config.js`
- Custom CSS di `src/App.css`
- Background color: `bg-[#f2fdf5]` (mint green)
- Primary color: `bg-[#14eb99]` (emerald)

#### 3. Admin Password
Admin password disimpan di database menggunakan `adminService.js`. Untuk mengubah password:
1. Login ke admin panel
2. Buka tab "Profile" 
3. Masukkan password lama dan password baru
4. Klik "Ubah Password"

## 🚀 Deployment

### Vercel (Recommended)
1. Push code ke GitHub
2. Connect repository di Vercel
3. Add environment variables
4. Deploy

### Manual Build
```bash
npm run build
# Upload build/ folder ke hosting
```

### Environment Variables di Production
Pastikan semua environment variables tersedia di platform hosting.

## 📊 Database Schema

### campaigns
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Campaign name |
| slug | VARCHAR(255) | URL slug (unique) |
| template_url | TEXT | Template image URL |
| is_active | BOOLEAN | Active status |
| campaign_type | VARCHAR(50) | 'text' atau 'photo' |
| deleted_at | TIMESTAMP | Soft delete timestamp |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### downloads
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | Foreign key to campaigns |
| user_name | VARCHAR(255) | User input name |
| additional_text | VARCHAR(255) | Additional text input |
| download_time | TIMESTAMP | Download timestamp |
| ip_address | INET | User IP address |
| user_agent | TEXT | Browser user agent |
| filename | VARCHAR(255) | Generated filename |
| random_id | VARCHAR(50) | Random identifier |

### admin_settings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| setting_key | VARCHAR(100) | Setting identifier (unique) |
| setting_value | TEXT | Setting value (hashed for passwords) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

## 🔒 Security

### Row Level Security (RLS)
- **Campaigns**: Read access untuk active campaigns, soft delete protection
- **Downloads**: Full access untuk tracking dan analytics
- **Admin Settings**: Full access untuk configuration management
- **Views**: Automated filtering untuk analytics dan soft-deleted items

### Input Validation
- File upload: Image type dan size validation (5MB limit)
- Text input: Character limits (25 karakter)
- Slug: Alphanumeric dan dash only

### Rate Limiting
- Download tracking untuk prevent spam
- Debounce pada button clicks
- Touch event handling untuk prevent double-tap

## 🛠 Development

### Available Scripts

```bash
npm start          # Development server
npm run build      # Production build
npm test          # Run tests
npm run eject     # Eject from Create React App
```

### Code Style
- Functional components dengan hooks
- Tailwind CSS untuk styling
- TypeScript untuk utilities
- ESLint configuration included

### Key Development Notes

#### Photo Editor Implementation
- CSS `object-contain` untuk preserve aspect ratio
- Canvas rendering yang match dengan preview
- Touch gesture handling untuk mobile
- Transform coordinates scaling antara preview dan final output

#### Performance Optimizations
- Image lazy loading
- Canvas rendering optimization
- Debounced API calls
- Memoized components where needed

## 🔍 Troubleshooting

### Common Issues

#### 1. Image Upload Fails
- Check Cloudinary configuration
- Verify file size (max 5MB)
- Ensure image format supported

#### 2. Database Connection Error
- Verify Supabase credentials
- Check RLS policies
- Ensure tables exist

#### 3. Photo Editor Touch Issues
- Disable browser zoom (`user-scalable=no`)
- Check `touch-action: none` on containers
- Verify event preventDefault calls

#### 4. Build Fails
- Check all environment variables
- Verify all dependencies installed
- Clear node_modules dan reinstall

### Debug Mode
Enable console logging di development:
```javascript
// Add to component for debugging
console.log('Debug info:', data);
```

## 📈 Analytics Events

### Tracked Events
- Campaign views
- Downloads per campaign
- User demographics
- Popular names
- Template performance

### CSV Export Fields
- Campaign name
- User name
- Download time
- IP address
- User agent
- Additional text

## 🎯 Future Enhancements

### Planned Features
- [ ] Multi-language support
- [ ] Advanced photo filters
- [ ] Batch download
- [ ] Campaign scheduling
- [ ] A/B testing untuk templates
- [ ] Push notifications
- [ ] PWA implementation

### Technical Improvements
- [ ] TypeScript migration
- [ ] Unit tests
- [ ] E2E tests
- [ ] Performance monitoring
- [ ] CDN optimization
- [ ] Image compression

## 📄 License

Aplikasi ini dibuat untuk STIBA Makassar. Silakan fork dan modifikasi sesuai kebutuhan.

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

Untuk pertanyaan atau issues:
- Create GitHub issue
- Contact: [@achmadzubairr](https://github.com/achmadzubairr)

---

**Made with ❤️ for STIBA Makassar**