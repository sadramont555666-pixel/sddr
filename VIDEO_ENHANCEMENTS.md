# سیستم پیشرفته مدیریت ویدیو با Link Preview

مستندات کامل چهار قابلیت جدید برای بهبود تجربه کاربری

## 📋 فهرست

1. [خلاصه تغییرات](#خلاصه-تغییرات)
2. [مرحله ۱: Link Unfurling (پیش‌نمایش خودکار لینک)](#مرحله-۱-link-unfurling)
3. [مرحله ۲: چیدمان شبکه‌ای سه ستونه](#مرحله-۲-چیدمان-شبکهای-سه-ستونه)
4. [مرحله ۳: ستون دسته‌بندی در جدول](#مرحله-۳-ستون-دستهبندی-در-جدول)
5. [مرحله ۴: فیلتر دسته‌بندی](#مرحله-۴-فیلتر-دستهبندی)
6. [Testing](#testing)

---

## 🎯 خلاصه تغییرات

### **قابلیت‌های جدید:**

1. ✅ **پیش‌نمایش خودکار لینک** - مشابه تلگرام
2. ✅ **چیدمان شبکه‌ای سه ستونه** - در داشبورد دانش‌آموز
3. ✅ **ستون دسته‌بندی** - در جدول پنل ادمین
4. ✅ **فیلتر دسته‌بندی** - dropdown در پنل ادمین

---

## 🔗 مرحله ۱: Link Unfurling (پیش‌نمایش خودکار لینک)

### 1.1. به‌روزرسانی Database Schema

**فایل:** `prisma/schema.prisma`

**تغییرات:**
```prisma
model Video {
  id                 String   @id @default(cuid())
  title              String   // عنوان اصلی که ادمین وارد می‌کند
  category           String
  videoUrl           String   // لینک یوتیوب
  thumbnailUrl       String?  // عکس پیش‌نمایش استخراج شده ← جدید
  videoTitle         String?  // عنوان استخراج شده از لینک ← جدید
  videoDescription   String?  // توضیحات استخراج شده از لینک ← جدید
  createdAt          DateTime @default(now())

  uploadedBy   User   @relation(fields: [uploadedById], references: [id])
  uploadedById String
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_video_link_preview_fields
```

---

### 1.2. API Endpoint: Unfurl Link

**مسیر:** `POST /api/admin/unfurl-link`

**کاربرد:** استخراج metadata از URL (Open Graph tags)

**Dependencies:**
- `jsdom` (برای HTML parsing)

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (Success):**
```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "description": "The official video...",
  "image": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "videoId": "dQw4w9WgXcQ",
  "platform": "youtube"
}
```

**ویژگی‌ها:**
- ✅ شناسایی خودکار YouTube URLs
- ✅ استخراج thumbnail با کیفیت بالا (`maxresdefault.jpg`)
- ✅ پشتیبانی از Open Graph tags
- ✅ Fallback برای لینک‌های غیر YouTube
- ✅ Error handling کامل

**پیاده‌سازی:**
```javascript
// src/app/api/admin/unfurl-link/route.js
import { JSDOM } from 'jsdom';

// Extract YouTube video ID
function getYouTubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Fetch metadata from URL
async function fetchMetadata(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0...',
    },
  });

  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Extract Open Graph tags
  const getMetaContent = (property) => {
    const meta = document.querySelector(`meta[property="${property}"]`) ||
                 document.querySelector(`meta[name="${property}"]`);
    return meta?.getAttribute('content') || null;
  };

  return {
    title: getMetaContent('og:title'),
    description: getMetaContent('og:description'),
    image: getMetaContent('og:image'),
  };
}
```

---

### 1.3. Frontend: فرم افزودن ویدیو با Preview

**فایل:** `src/app/admin/videos/page.tsx`

**تغییرات:**

#### State Management:
```tsx
const [linkPreview, setLinkPreview] = useState<LinkPreview>(null);
const [fetchingPreview, setFetchingPreview] = useState(false);

type LinkPreview = {
  title: string | null;
  description: string | null;
  image: string | null;
  platform?: string;
} | null;
```

#### Fetch Function:
```tsx
const fetchLinkPreview = async (url: string) => {
  setFetchingPreview(true);
  
  try {
    const response = await fetch('/api/admin/unfurl-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url: url.trim() }),
    });

    if (response.ok) {
      const data = await response.json();
      setLinkPreview(data);
      
      // Auto-fill form
      setForm(prev => ({
        ...prev,
        thumbnailUrl: data.image || undefined,
        videoTitle: data.title || undefined,
        videoDescription: data.description || undefined,
      }));
    }
  } catch (error) {
    setLinkPreview(null);
  } finally {
    setFetchingPreview(false);
  }
};
```

#### UI Component (Input با onBlur):
```tsx
<input
  type="url"
  value={form.videoUrl}
  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
  onBlur={(e) => fetchLinkPreview(e.target.value)}
  placeholder="https://www.youtube.com/watch?v=..."
  dir="ltr"
/>

{/* Loading State */}
{fetchingPreview && (
  <div className="mt-3 p-4 border border-gray-200 rounded-lg animate-pulse">
    در حال بارگذاری پیش‌نمایش...
  </div>
)}

{/* Preview Card (مشابه تلگرام) */}
{linkPreview && !fetchingPreview && (
  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
    {linkPreview.image && (
      <img
        src={linkPreview.image}
        alt="Preview"
        className="w-full h-48 object-cover"
      />
    )}
    <div className="p-4">
      {linkPreview.title && (
        <h4 className="font-semibold text-gray-800 mb-1">
          {linkPreview.title}
        </h4>
      )}
      {linkPreview.description && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {linkPreview.description}
        </p>
      )}
      {linkPreview.platform && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full mt-2">
          {linkPreview.platform}
        </span>
      )}
    </div>
  </div>
)}
```

---

### 1.4. Backend: ذخیره‌سازی داده‌های Preview

**فایل:** `src/server/controllers/admin/videos.ts`

**Schema Validation:**
```typescript
const videoBodySchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().optional(),      // ← جدید
  videoTitle: z.string().optional(),        // ← جدید
  videoDescription: z.string().optional(),  // ← جدید
});
```

**Create Video:**
```typescript
const video = await prisma.video.create({
  data: {
    title: data.title,
    category: data.category,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl,        // ← جدید
    videoTitle: data.videoTitle,            // ← جدید
    videoDescription: data.videoDescription, // ← جدید
    uploadedById: adminId,
  },
});
```

---

## 📐 مرحله ۲: چیدمان شبکه‌ای سه ستونه

**وضعیت:** ✅ **قبلاً پیاده‌سازی شده**

**فایل:** `src/app/videos/page.jsx` (داشبورد دانش‌آموز)

**کد موجود:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {videos.map((video) => (
    <div key={video.id} className="bg-white rounded-xl...">
      {/* Video Card */}
    </div>
  ))}
</div>
```

**نتیجه:**
- 📱 **Mobile:** 1 ستون
- 📱 **Tablet:** 2 ستون
- 🖥️ **Desktop:** 3 ستون

---

## 📊 مرحله ۳: ستون دسته‌بندی در جدول

**وضعیت:** ✅ **قبلاً موجود**

**فایل:** `src/app/admin/videos/page.tsx`

**کد موجود:**
```tsx
<thead>
  <tr>
    <th>عنوان</th>
    <th>دسته‌بندی</th>  {/* ← قبلاً موجود */}
    <th>آپلودکننده</th>
    <th>تاریخ</th>
    <th>عملیات</th>
  </tr>
</thead>
<tbody>
  {items.map((video) => (
    <tr key={video.id}>
      <td>{video.title}</td>
      <td>
        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
          {video.category}
        </span>
      </td>
      <td>{video.uploadedBy?.name}</td>
      <td>{new Date(video.createdAt).toLocaleDateString('fa-IR')}</td>
      <td>{/* Actions */}</td>
    </tr>
  ))}
</tbody>
```

---

## 🎛️ مرحله ۴: فیلتر دسته‌بندی

### 4.1. Backend: API Filter Support

**وضعیت:** ✅ **قبلاً پیاده‌سازی شده**

**فایل:** `src/server/controllers/admin/videos.ts`

**کد موجود:**
```typescript
videosRouter.get('/', async (c) => {
  const { page, pageSize, category } = parsed.data;
  
  const where: any = {};
  if (category && category.trim()) {
    where.category = category.trim();  // ← فیلتر موجود
  }

  const videos = await prisma.video.findMany({ where });
  // ...
});
```

---

### 4.2. Frontend Hook: Support for Category Parameter

**فایل:** `src/hooks/admin/useAdminChallengesVideos.ts`

**تغییر:**
```typescript
// قبل:
export function useAdminVideos(page: number = 1) {
  return useQuery({
    queryKey: ['adminVideos', page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/videos?page=${page}`);
      // ...
    },
  });
}

// بعد:
export function useAdminVideos(page: number = 1, category?: string) {
  return useQuery({
    queryKey: ['adminVideos', page, category],  // ← category added
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString() });
      if (category && category !== 'all') {
        params.append('category', category);  // ← فیلتر
      }
      const res = await fetch(`/api/admin/videos?${params.toString()}`);
      // ...
    },
  });
}
```

---

### 4.3. Frontend UI: Dropdown Filter

**فایل:** `src/app/admin/videos/page.tsx`

**State:**
```tsx
const [selectedCategory, setSelectedCategory] = useState<string>('all');
const { data, isLoading } = useAdminVideos(page, selectedCategory);

const categories = [
  { value: 'all', label: 'همه دسته‌ها' },
  { value: 'آموزشی', label: 'آموزشی' },
  { value: 'انگیزشی', label: 'انگیزشی' },
  { value: 'تکنیک مطالعه', label: 'تکنیک مطالعه' },
  { value: 'مدیریت زمان', label: 'مدیریت زمان' },
  { value: 'روانشناسی', label: 'روانشناسی' },
];
```

**UI Component:**
```tsx
<div className="mb-6 flex items-center gap-3">
  <label className="text-sm font-medium text-gray-700">
    فیلتر بر اساس دسته‌بندی:
  </label>
  <select
    value={selectedCategory}
    onChange={(e) => {
      setSelectedCategory(e.target.value);
      setPage(1); // Reset to first page
    }}
    className="px-4 py-2 border rounded-lg..."
  >
    {categories.map((cat) => (
      <option key={cat.value} value={cat.value}>
        {cat.label}
      </option>
    ))}
  </select>
  {selectedCategory !== 'all' && (
    <span className="text-sm text-gray-500">
      ({total} ویدیو)
    </span>
  )}
</div>
```

**رفتار:**
1. کاربر دسته‌بندی را انتخاب می‌کند
2. `selectedCategory` state به‌روز می‌شود
3. Hook با `category` جدید refetch می‌کند
4. جدول فقط ویدیوهای فیلتر شده را نمایش می‌دهد
5. صفحه به 1 reset می‌شود

---

## 🧪 Testing

### 1. تست Link Preview

```bash
# 1. افزودن ویدیو جدید در /admin/videos
# 2. وارد کردن لینک: https://www.youtube.com/watch?v=dQw4w9WgXcQ
# 3. کلیک خارج از input (onBlur)
# 4. بررسی:
✓ کارت پیش‌نمایش نمایش داده می‌شود؟
✓ عکس thumbnail بارگذاری شد؟
✓ عنوان و توضیحات نمایش داده می‌شود؟
✓ badge "youtube" وجود دارد؟
```

### 2. تست فیلتر دسته‌بندی

```bash
# 1. رفتن به /admin/videos
# 2. انتخاب "آموزشی" از dropdown
# 3. بررسی:
✓ فقط ویدیوهای آموزشی نمایش داده می‌شود؟
✓ تعداد ویدیوها کنار dropdown صحیح است؟
✓ صفحه به 1 reset شد؟

# 4. تغییر به "همه دسته‌ها"
✓ تمام ویدیوها نمایش داده می‌شود؟
```

### 3. تست API (cURL)

```bash
# Test unfurl-link
curl -X POST http://localhost:4000/api/admin/unfurl-link \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=..." \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  | jq

# Expected response:
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "description": "...",
  "image": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "videoId": "dQw4w9WgXcQ",
  "platform": "youtube"
}

# Test category filter
curl "http://localhost:4000/api/admin/videos?category=آموزشی" \
  -H "Cookie: authjs.session-token=..." \
  | jq '.items[] | .category'

# Should only show "آموزشی"
```

---

## 📊 مقایسه قبل و بعد

| ویژگی | قبل | بعد |
|------|-----|-----|
| **ورود لینک** | Manual typing | ✅ **Preview card** (مشابه تلگرام) |
| **Thumbnail** | Generic placeholder | ✅ **Auto-extracted** (YouTube maxres) |
| **Metadata** | ❌ | ✅ **Title + Description** |
| **فیلتر دسته‌بندی** | ❌ | ✅ **Dropdown filter** |
| **نمایش ویدیوها (student)** | Variable | ✅ **3-column grid** |
| **جدول ادمین** | Basic | ✅ **+ Category column** |

---

## 🚀 آماده استفاده!

همه چیز کامل است:

1. ✅ Database schema به‌روز شده (3 فیلد جدید)
2. ✅ API endpoint `/api/admin/unfurl-link`
3. ✅ Frontend preview card (onBlur trigger)
4. ✅ Backend save metadata
5. ✅ Grid layout (3 columns)
6. ✅ Category filter dropdown
7. ✅ `jsdom` installed

**برای تست:**
```
http://localhost:4000/admin/videos
```

---

**نسخه:** 1.0.0  
**تاریخ:** 2025-10-11  
**توسعه‌دهنده:** Full-Stack Team

