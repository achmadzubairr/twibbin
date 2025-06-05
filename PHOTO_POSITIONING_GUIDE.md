# Photo Positioning & Zoom Feature Guide

## Fitur Baru: Custom Photo Positioning

Fitur ini memungkinkan user untuk mengatur posisi foto mereka di mana saja dalam template dan melakukan zoom in/out foto dengan interface drag-and-drop yang intuitif.

## 🎯 Fitur Utama

### 1. **Drag & Drop Positioning**
- User dapat drag foto ke posisi mana saja dalam template
- Real-time preview positioning
- Visual guide lines saat drag
- Touch support untuk mobile

### 2. **Zoom Controls**
- Slider untuk zoom in/out (50% - 300%)
- Slider untuk mengatur ukuran foto (10% - 80% dari template)
- Real-time preview perubahan

### 3. **Interactive Editor**
- Preview template dengan foto user
- Posisi coordinates display
- Reset button ke posisi tengah
- Visual feedback saat editing

## 📁 File yang Ditambahkan/Dimodifikasi

### 1. **PhotoEditor Component**
- **File**: `src/components/PhotoEditor.js`
- **CSS**: `src/components/PhotoEditor.css`
- **Fitur**:
  - Drag & drop interface
  - Zoom & size controls
  - Mobile touch support
  - Position constraints

### 2. **Enhanced Image Processor**
- **File**: `src/utils/imageProcessor.js`
- **Fungsi Baru**:
  - `createCustomPositionedImage()`: Create final image dengan positioning
  - Enhanced `createCircularImage()` dengan scale support
  - Updated `overlayImageOnTemplate()` dengan percentage-based positioning

### 3. **Updated Campaign Page**
- **File**: `src/pages/campaign/CampaignPage.js`
- **Perubahan**:
  - Two-phase UI: Upload → Edit → Download
  - State management untuk photo positioning
  - Integration dengan PhotoEditor component

## 🎮 User Experience Flow

### Phase 1: Upload
```
User visits photo campaign → Upload foto → Validation
```

### Phase 2: Positioning
```
PhotoEditor muncul → Drag foto ke posisi yang diinginkan → 
Adjust size & zoom → Real-time preview update
```

### Phase 3: Download
```
Klik "Unduh Gambar" → Final image generated → Download
```

## ⚙️ Technical Configuration

### Position Object Structure
```javascript
{
  x: 50,      // X position in percentage (0-100)
  y: 50,      // Y position in percentage (0-100)  
  size: 30,   // Size in percentage of template (10-80)
  scale: 1    // Zoom scale factor (0.5-3.0)
}
```

### Default Settings
- **Initial Position**: Center (50%, 50%)
- **Initial Size**: 30% of template
- **Initial Scale**: 100% (1.0)
- **File Size Limit**: 5MB
- **Output Resolution**: 1000x1000px

## 🎨 Styling & UI

### PhotoEditor Styles
- Custom slider styling dengan brand colors
- Responsive design untuk mobile
- Visual feedback untuk dragging state
- Guide lines untuk positioning

### Color Scheme
- Primary: #14eb99 (brand green)
- Secondary: #e5e7eb (gray)
- Active: #3b82f6 (blue)

## 📱 Mobile Support

- Touch events untuk drag functionality
- Larger touch targets untuk sliders
- Responsive layout
- Optimized untuk layar kecil

## 🔧 Customization Options

### Adjust Position Constraints
Di `PhotoEditor.js`, line ~45-50:
```javascript
// Constrain to container bounds
const constrainedX = Math.max(0, Math.min(100, newX));
const constrainedY = Math.max(0, Math.min(100, newY));
```

### Modify Size/Scale Limits
Di `PhotoEditor.js`:
```javascript
// Size: line ~60
size: Math.max(10, Math.min(80, newSize))

// Scale: line ~66  
scale: Math.max(0.5, Math.min(3, newScale))
```

### Change Output Resolution
Di `CampaignPage.js`, line ~101:
```javascript
const finalImage = await createCustomPositionedImage(
  campaign.template_url,
  photo,
  position,
  1000,  // Width - ubah sesuai kebutuhan
  1000   // Height - ubah sesuai kebutuhan
);
```

## 🧪 Testing Checklist

- [ ] Upload foto berbagai format (JPG, PNG, WEBP)
- [ ] Test drag positioning di desktop
- [ ] Test touch positioning di mobile
- [ ] Test zoom slider functionality
- [ ] Test size slider functionality
- [ ] Test reset button
- [ ] Test "Ganti Foto" button
- [ ] Test download dengan berbagai posisi
- [ ] Test file size validation
- [ ] Test responsive design

## 🚀 Deployment Notes

1. Pastikan `fix-campaign-type-column.sql` sudah dijalankan
2. Test dengan template yang berbeda-beda
3. Monitor performance untuk processing gambar besar
4. Consider lazy loading untuk PhotoEditor component

## 🔮 Future Enhancements

- **Multiple Photo Slots**: Support multiple foto dalam satu template
- **Shape Options**: Selain lingkaran, tambah kotak, oval, dll
- **Rotation**: Kemampuan rotate foto
- **Filters**: Basic filters untuk foto (brightness, contrast, dll)
- **Crop Tool**: Advanced cropping sebelum positioning
- **Template Zones**: Pre-defined zones dalam template
- **Undo/Redo**: History untuk positioning changes

## 🐛 Troubleshooting

### Foto tidak muncul setelah upload
- Check browser console untuk errors
- Pastikan file size < 5MB
- Pastikan format file supported

### Drag tidak berfungsi di mobile
- Pastikan touch events tidak conflicting
- Check CSS touch-action properties

### Download menghasilkan gambar kosong
- Check template URL accessibility
- Verify CORS settings untuk template images
- Check browser support untuk Canvas operations

### Performance issues
- Optimize image processing untuk large files
- Consider image compression before processing
- Debounce position updates untuk smooth performance