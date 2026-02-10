# Gemini Planning Poker

A real-time collaborative planning poker application with AI-powered teammates.

## Features

- 🎴 **Real-time Collaboration**: Multiple players can join the same room and vote in real-time
- 🤖 **AI Teammates**: Add AI players with different personas that provide intelligent estimates
- 📊 **Visual Results**: Beautiful charts showing voting consensus and statistics
- 🔗 **Easy Sharing**: Share room links with team members
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd poker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key  # Optional, for AI voting
```

### Supabase Setup

1. Go to your Supabase project
2. Run the database migration in the SQL editor:
```sql
-- See supabase/migrations/001_initial_schema.sql
```

3. Enable Realtime for these tables:
   - `rooms`
   - `players`
   - `votes`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
```

## Usage

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## How It Works

1. **Create or Join a Room**: Share the room URL with your team
2. **Add Players**: Add human players via the link or AI teammates
3. **Set the Story**: Optionally add a story title and description
4. **Start Voting**: Players select cards to vote
5. **Reveal Results**: See the consensus and statistics
6. **Next Round**: Start a new voting round

## Database Schema

### `rooms`
- Stores room state (story, phase)
- Synced via Realtime subscriptions

### `players`
- Tracks all players in a room
- Supports both HUMAN and AI types

### `votes`
- Records player votes
- Updated in real-time across all clients

## AI Integration

The app uses Google's Gemini AI to generate intelligent estimates based on:
- Story description
- AI persona (Senior Dev, Junior Dev, QA Lead, Product Manager)
- Technical complexity assessment

To enable AI voting, set `VITE_GEMINI_API_KEY` in your `.env` file.

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **AI**: Google Gemini API
- **Icons**: Lucide React
- **Charts**: Recharts

## Free Tier Limits

Supabase's free tier provides:
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth/month
- 50,000 database rows/month
- 200 concurrent connections

This is more than sufficient for planning poker sessions with dozens of concurrent rooms.

## License

MIT
