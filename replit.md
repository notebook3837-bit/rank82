# Zama Creator Rank Checker

## Overview

This is a web application that tracks and displays leaderboard rankings for the Zama Creator Program across multiple seasons. The application scrapes leaderboard data from the official Zama website and provides users with real-time ranking information, historical data tracking, and search functionality.

The application serves as a rank checker where users can:
- View current and historical leaderboard standings across seasons (S1-S5)
- Search for specific creators by username or handle
- Track ranking changes over different time periods (24h, 7d, 30d)
- Access automatically updated data through scheduled scraping

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: The application uses shadcn/ui (New York style) built on top of Radix UI primitives. This provides a comprehensive set of accessible, customizable components including tables, cards, buttons, dialogs, and form elements.

**Styling Approach**: Tailwind CSS v4 (via `@tailwindcss/vite`) with CSS variables for theming. The application implements a custom "Zama Yellow" theme with high contrast, using bright yellow as the primary background color and near-black text for maximum readability.

**State Management**: TanStack Query (React Query) v5 for server state management, providing automatic caching, background refetching, and optimistic updates. Query configuration disables refetch on window focus and sets stale time to infinity, relying on manual refetch or scheduled intervals.

**Routing**: Wouter for lightweight client-side routing

**Key Custom Components**:
- `RankTable`: Displays leaderboard data with medal icons for top 3, user avatars, and rank change indicators
- `StatsCard`: Shows key metrics with icons (trophy, flame, users, clock)
- `TierSelector`: Season navigation (S1-S5)
- `TimeSelector`: Time range filtering (24h, 7d, 30d)

**Design Decisions**:
- Uses a brutalist/neo-brutalist design style with bold borders, high contrast colors, and prominent shadows
- Auto-refreshes leaderboard data every 60 seconds to keep rankings current
- Implements responsive design with mobile breakpoint at 768px

### Backend Architecture

**Framework**: Express.js running on Node.js with TypeScript

**API Design**: RESTful API with the following endpoint structure:
- `GET /api/leaderboard/:season?range=<timeRange>` - Retrieves leaderboard data for a specific season with optional time filtering

**Data Scraping**: Custom web scraper using Cheerio to parse HTML from the Zama Creator Program website. The scraper:
- Runs on a scheduled interval (every 60 seconds)
- Extracts rank, username, handle, and mindshare data from HTML tables
- Stores timestamped snapshots to enable historical analysis
- Currently targets Season 5 (active season) with support for historical seasons (S1-S4)

**Scheduler**: Custom implementation that prevents overlapping scraper runs and provides console logging for monitoring

**Build Process**: esbuild bundles the server code with selective dependencies for optimal cold start performance. The build script allowlists specific dependencies for bundling while externalizing others.

**Design Decisions**:
- Separates scraping logic from API serving for better maintainability
- Uses timestamped entries to track ranking changes over time
- Implements seed data as fallback for initial deployment
- Serves static frontend assets from `/dist/public` in production

### Data Storage

**Database**: PostgreSQL accessed via Drizzle ORM

**Schema Design**:

1. **leaderboardEntries table**:
   - `id` (serial primary key)
   - `season` (text) - Season identifier (s1-s5)
   - `rank` (integer) - User's ranking position
   - `username` (text) - Display name
   - `handle` (text) - Twitter/social handle
   - `mindshare` (real) - Engagement metric
   - `scrapedAt` (timestamp) - When data was collected

2. **users table**: Basic authentication schema (currently unused but available for future features)
   - `id` (UUID primary key)
   - `username` (text, unique)
   - `password` (text)

**Data Access Layer**: DatabaseStorage class implementing IStorage interface provides abstraction over database operations:
- `saveLeaderboardEntries()` - Bulk insert scraped data
- `getLeaderboardEntries()` - Retrieve entries with optional time filtering
- `getLatestLeaderboardData()` - Get most recent snapshot per user for a season

**Design Decisions**:
- Stores all scraped entries with timestamps to enable historical analysis
- Uses aggregation to get latest rank per user when multiple entries exist
- Separates storage interface from implementation for testability
- Indexes not explicitly defined in schema but should be added on (season, scrapedAt) and (season, handle) for query performance

### External Dependencies

**Third-Party Services**:
- Zama Creator Program Website (`https://www.zama.org/programs/creator-program`) - Source for leaderboard data via web scraping
- PostgreSQL Database - Must be provisioned and accessible via `DATABASE_URL` environment variable

**Key NPM Packages**:
- **Frontend**: React, Vite, TanStack Query, Wouter, shadcn/ui, Radix UI, Tailwind CSS, Lucide Icons
- **Backend**: Express, Drizzle ORM, node-postgres (pg), Cheerio (HTML parsing), node-fetch
- **Development**: TypeScript, tsx (TS execution), esbuild (bundling)

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Development tooling
- `@replit/vite-plugin-dev-banner` - Development banner
- Custom `metaImagesPlugin` - Updates OpenGraph/Twitter meta tags with Replit deployment URLs

**Environment Variables Required**:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - Environment indicator (development/production)
- `REPL_ID` - Replit environment identifier (for dev plugins)

**Design Decisions**:
- Web scraping chosen over API integration due to lack of official Zama API
- Cheerio selected for HTML parsing due to simplicity and performance
- Drizzle ORM chosen for type-safe database queries with minimal overhead
- Connection pooling via pg.Pool for efficient database access