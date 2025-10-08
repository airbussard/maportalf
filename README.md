# FLIGHTHOUR Next.js Portal

**Version 2.000** - Modern Next.js 15 Implementation

## 🚀 Status

✅ **Phase 1 Complete** - Foundation & Authentication

- Next.js 15 with TypeScript
- Supabase Integration (Production DB)
- Authentication (Login, Register, Password Reset)
- Basic Dashboard
- Modern Design System (Tailwind CSS 4)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Icons**: Lucide React

## 📦 Installation

```bash
npm install
```

## 🔧 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_VERSION=2.000
```

## 🏃 Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Build

```bash
npm run build
npm start
```

## 📋 Modules (Planned)

- ✅ Dashboard
- ✅ Authentication
- ⏳ Documents
- ⏳ Tickets
- ⏳ Time Tracking
- ⏳ Work Requests
- ⏳ Employees
- ⏳ Time Management (Admin)
- ⏳ Tags
- ⏳ Email Settings

## 🔐 Security

- Row Level Security (RLS) aktiviert
- Supabase Auth Integration
- Server-side Session Management
- Protected Routes via Middleware

## 📝 Database

Uses existing Supabase production database:
- No schema changes required
- Parallel operation with PHP system
- Shared authentication

## 🚀 Deployment

Auto-deployed via CapRover webhook on every git push to main.

---

**FLIGHTHOUR Employee Portal** | Version 2.000
