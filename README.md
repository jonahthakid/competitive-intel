# CompetitorEdge

Competitive intelligence platform for tracking competitor promos, emails, and pricing in real-time.

## Features

- **Homepage Monitoring**: Track announcement bars, hero banners, and sitewide sales
- **Email Intelligence**: See every email competitors send (coming soon)
- **Real-Time Alerts**: Get notified when competitors make moves
- **Promo Calendar**: Visualize promotional patterns over time

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **Scraping**: Cheerio, Axios

## Quick Start

### 1. Clone and Install

```bash
cd competitoredge
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and keys

### 3. Set Up Clerk

1. Create a new application at [clerk.com](https://clerk.com)
2. Copy your publishable and secret keys

### 4. Configure Environment

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
competitoredge/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── competitors/      # Competitor CRUD + scraping
│   │   │   └── feed/             # Activity feed endpoint
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Activity feed UI
│   │   │   ├── competitors/      # Competitor management
│   │   │   ├── alerts/           # Alerts (coming soon)
│   │   │   ├── calendar/         # Promo calendar (coming soon)
│   │   │   └── settings/         # Account settings
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase.ts           # Database client + types
│   │   ├── scraper.ts            # Homepage scraping logic
│   │   └── utils.ts              # Utility functions
│   └── middleware.ts             # Clerk auth middleware
├── supabase/
│   └── schema.sql                # Database schema
├── .env.example
├── package.json
└── README.md
```

## Database Schema

- **organizations**: Multi-tenant accounts
- **competitors**: Brands being tracked
- **promos**: Detected homepage promotions
- **emails**: Captured email campaigns (future)
- **alerts**: Notification events

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/competitors | List competitors |
| POST | /api/competitors | Add competitor |
| DELETE | /api/competitors/[id] | Remove competitor |
| POST | /api/competitors/[id]/scrape | Trigger scrape |
| GET | /api/feed | Get activity feed |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual

```bash
npm run build
npm start
```

## Roadmap

- [x] Homepage scraping
- [x] Competitor management
- [x] Activity feed
- [ ] Email ingestion (Mailgun)
- [ ] Real-time alerts
- [ ] Promo calendar visualization
- [ ] Slack integration
- [ ] Stripe billing

## License

MIT
