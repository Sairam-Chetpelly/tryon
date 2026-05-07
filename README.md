# 💎 JewelTry — AI Jewelry Virtual Try-On

A production-ready Next.js 15 application that lets users virtually try on jewelry using AI.

![JewelTry Preview](https://via.placeholder.com/800x400/1a1208/c9a84c?text=JewelTry+AI+Virtual+Try-On)

---

## ✨ Features

- **Drag & Drop Upload** — Upload user photo and jewelry image with preview
- **8 Jewelry Categories** — Necklace, Earrings, Ring, Bracelet, Anklet, Brooch, Tiara, Pendant
- **AI Try-On** — Realistic jewelry placement using AI providers
- **Before/After Comparison** — Interactive slider to compare original vs result
- **Side-by-Side View** — Split view for easy comparison
- **Download Result** — Save the generated image
- **Share** — Native share API or clipboard copy
- **Try-On History** — View and manage previous try-ons
- **Responsive Design** — Works on mobile, tablet, and desktop
- **Demo Mode** — Works without API keys using built-in image compositor

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd jewelry-tryon
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# For demo mode (no API key needed):
TRYON_PROVIDER=demo

# For YouCam AI (recommended for production):
TRYON_PROVIDER=youcam
YOUCAM_API_KEY=your_key_here
YOUCAM_API_SECRET=your_secret_here

# For Fashn.ai:
TRYON_PROVIDER=fashn
FASHN_API_KEY=your_key_here

# For Replicate (open-source models):
TRYON_PROVIDER=replicate
REPLICATE_API_TOKEN=your_token_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 API Provider Setup

### Option 1: Demo Mode (Default)
No API key needed. Uses `sharp` to composite the jewelry image onto the user photo.
Best for development and testing.

### Option 2: YouCam API (Best Quality)
1. Sign up at [developer.youcam.com](https://developer.youcam.com)
2. Create an app and get your API key + secret
3. Set `TRYON_PROVIDER=youcam` in `.env.local`

### Option 3: Fashn.ai
1. Sign up at [fashn.ai](https://fashn.ai)
2. Get your API key from the dashboard
3. Set `TRYON_PROVIDER=fashn` in `.env.local`

### Option 4: Replicate
1. Sign up at [replicate.com](https://replicate.com)
2. Get your API token from account settings
3. Set `TRYON_PROVIDER=replicate` in `.env.local`

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tryon/route.ts      # Main try-on API endpoint
│   │   └── history/route.ts    # History CRUD API
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── Header.tsx              # Navigation bar
│   ├── TryOnForm.tsx           # Main form orchestrator
│   ├── ImageDropzone.tsx       # Drag & drop upload
│   ├── CategorySelector.tsx    # Jewelry type picker
│   ├── ProcessingOverlay.tsx   # Loading screen
│   ├── ResultDisplay.tsx       # Result + comparison
│   └── HistoryPanel.tsx        # History drawer
├── lib/
│   ├── constants.ts            # App constants
│   ├── utils.ts                # Utility functions
│   ├── tryon-service.ts        # Provider router
│   └── providers/
│       ├── demo.ts             # Built-in compositor
│       ├── youcam.ts           # YouCam API
│       ├── fashn.ts            # Fashn.ai API
│       └── replicate.ts        # Replicate API
└── types/
    └── index.ts                # TypeScript types
```

---

## 🏗️ Production Build

```bash
npm run build
npm start
```

---

## ☁️ Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### AWS (EC2 / ECS)

```bash
npm run build
npm start
# Or use PM2:
pm2 start npm --name "jewelry-tryon" -- start
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔧 Configuration

| Variable | Description | Default |
|---|---|---|
| `TRYON_PROVIDER` | AI provider: `demo`, `youcam`, `fashn`, `replicate` | `demo` |
| `YOUCAM_API_KEY` | YouCam API key | — |
| `YOUCAM_API_SECRET` | YouCam API secret | — |
| `FASHN_API_KEY` | Fashn.ai API key | — |
| `REPLICATE_API_TOKEN` | Replicate API token | — |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key (optional) | — |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret (optional) | — |
| `AWS_S3_BUCKET_NAME` | S3 bucket for image storage | — |

---

## 🛣️ Roadmap / Bonus Features

- [ ] Live camera try-on (WebRTC)
- [ ] Multiple jewelry try-ons simultaneously
- [ ] User authentication (NextAuth)
- [ ] AWS S3 persistent image storage
- [ ] Background removal for jewelry images
- [ ] AI face/body landmark alignment
- [ ] Social sharing with generated cards

---

## 📄 License

MIT
