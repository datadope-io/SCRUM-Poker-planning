# Gemini Planning Poker - Agent Documentation

## Project Overview

A real-time collaborative planning poker application with AI-powered teammates. Users can join rooms, vote on stories using Fibonacci cards, and see real-time results with statistics.

**Key Features:**
- Multi-room real-time collaboration via Supabase
- AI teammates with different personas (Senior Dev, Junior Dev, QA Lead, Product Manager)
- Intelligent estimates using Google Gemini AI
- Real-time phase and vote synchronization across clients
- Player connection list before voting
- Username persistence via localStorage
- Results visualization with statistics and charts

---

## Tech Stack

### Frontend
- **React 19.2.4** - UI framework
- **Vite 6.2.0** - Build tool and dev server
- **TypeScript 5.8.2** - Type safety
- **Tailwind CSS** - Styling (via CDN for development)

### Backend & Database
- **Supabase** - PostgreSQL + Realtime subscriptions
- **PostgreSQL** - Database (hosted by Supabase)

### External Services
- **Google Gemini AI** - AI-powered estimates
- **Lucide React** - Icon library
- **Recharts** - Data visualization

---

## Architecture

### State Management

The app uses a combination of:
1. **React state** (useState, useEffect) for local UI state
2. **Supabase Realtime subscriptions** for cross-client synchronization
3. **localStorage** for persistent data (username, user IDs)

### Data Flow

```
User Action → Update Phase
     ↓
Set Local State (immediate)
     ↓
Update Database (Supabase)
     ↓
Realtime Broadcast
     ↓
All Clients Update State
```

### Phase Transitions

```
SETUP (initial phase)
  ↓
VOTING (after clicking Start)
  ↓
REVEALED (after clicking Reveal Cards)
  ↓
VOTING (Next Round)
```

---

## File Structure

```
poker/
├── components/           # React components
│   ├── Card.jsx          # Voting card component
│   ├── PlayerAvatar.jsx  # Player display with avatar
│   ├── StoryPanel.jsx    # Story setup and control panel
│   ├── ResultsChart.jsx  # Results visualization
│   └── UsernameModal.tsx # Username prompt component
├── hooks/                 # React hooks
│   └── useSupabaseRoom.tsx # Room management and realtime sync
├── lib/                   # Utilities
│   ├── supabase.ts      # Supabase client configuration
│   └── utils.ts         # Helper functions (ID generation)
├── services/              # External services
│   └── geminiService.ts  # Gemini AI integration
├── supabase/             # Database
│   └── migrations/
│       └── 001_initial_schema.sql
├── constants.ts          # AI personas and deck config
├── types.ts              # TypeScript type definitions
├── App.tsx               # Main application component
├── index.tsx             # Entry point
├── index.html            # HTML template
├── index.css             # Custom styles
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies
└── .env                  # Environment variables (not committed)
```

---

## Key Components

### App.tsx
Main application component that:
- Manages room ID state (from URL or generated)
- Uses `useSupabaseRoom` hook for room management
- Renders StoryPanel, player avatars, and voting UI
- Handles navigation to new games

### useSupabaseRoom.tsx (Custom Hook)
Core business logic hook that:
- Manages room state (phase, story, players, votes)
- Handles Supabase realtime subscriptions
- Manages user identity (username, persistent ID per room)
- Triggers AI votes automatically when phase changes to VOTING
- Provides methods: `updatePhase`, `updateStory`, `addAiPlayers`, `handleVote`, `copyInviteLink`

### StoryPanel.jsx
Control panel component that:
- Displays story details and phase status
- Shows player list in SETUP phase
- Provides buttons: Start, Re-vote, Next Round
- Optional: Add topic details (title, description)

### PlayerAvatar.jsx
Player display component that:
- Shows player avatar image
- Displays vote card (hidden when not revealed)
- Shows AI persona on hover
- Indicates connection status

### Card.jsx
Voting card component that:
- Displays Fibonacci card values
- Shows selected state
- Handles click events for voting
- Supports both normal and small sizes

### ResultsChart.jsx
Results visualization component that:
- Shows average score, agreement percentage, most voted card
- Displays bar chart of vote distribution
- Shows consensus (100% = Unanimous)

### UsernameModal.tsx
Username prompt component that:
- Shows modal on first visit
- Validates name (2-20 characters)
- Saves username to localStorage

---

## Database Schema

### `rooms` table
```sql
- id (TEXT PRIMARY KEY)          -- Room identifier (short string)
- created_at (TIMESTAMP)         -- Creation timestamp
- updated_at (TIMESTAMP)         -- Last update timestamp
- story_title (TEXT)            -- Story title (optional)
- story_description (TEXT)      -- Story description (optional)
- phase (TEXT)                   -- Current phase: SETUP | VOTING | REVEALED
```

### `players` table
```sql
- id (TEXT PRIMARY KEY)          -- Player unique ID
- room_id (TEXT, FOREIGN KEY)   -- Room reference
- name (TEXT NOT NULL)           -- Player display name
- type (TEXT NOT NULL)          -- Player type: HUMAN | AI
- avatar_url (TEXT NOT NULL)    -- Player avatar image URL
- persona (TEXT)                -- AI persona description (for AI only)
- created_at (TIMESTAMP)         -- Join timestamp
- updated_at (TIMESTAMP)         -- Last update timestamp
```

### `votes` table
```sql
- id (TEXT PRIMARY KEY)          -- Vote unique ID (composite: room_id-player_id)
- room_id (TEXT, FOREIGN KEY)   -- Room reference
- player_id (TEXT, FOREIGN KEY) -- Player reference
- value (TEXT NOT NULL)         -- Card value (1, 2, 3, 5, 8, 13, 21, ?)
- reasoning (TEXT)              -- AI reasoning (for AI votes)
- created_at (TIMESTAMP)         -- Vote timestamp
- updated_at (TIMESTAMP)         -- Last update timestamp
```

**Unique constraint:** `(room_id, player_id)` - One vote per player per round

---

## Development Workflow

### Setting Up a New Development Environment

1. **Clone and install:**
   ```bash
   git clone <repository>
   cd poker
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials and Gemini API key
   ```

3. **Run database migrations:**
   - Copy SQL from `supabase/migrations/001_initial_schema.sql`
   - Run in Supabase SQL Editor

4. **Enable realtime:**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Common Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check TypeScript errors
npx tsc --noEmit

# Format code (if using Prettier)
npx prettier --write .
```

### Git Workflow

```bash
# View changes
git status
git diff

# Add changes
git add .

# Commit (conventional commits)
git commit -m "type: subject

- detail 1
- detail 2"

# Types: feat, fix, refactor, chore, docs, style, test

# Amend last commit
git commit --amend -m "new message"
```

---

## Testing Approach

### Manual Testing Checklist

1. **Room Creation:**
   - [ ] Navigate to app generates new room ID
   - [ ] Can join specific room via URL parameter
   - [ ] Room ID persists in URL

2. **Username:**
   - [ ] Prompt shown on first visit
   - [ ] Username validated (2-20 chars)
   - [ ] Username persisted across sessions
   - [ ] Prompt doesn't show on subsequent visits

3. **Player List (SETUP phase):**
   - [ ] Shows connected human players
   - [ ] Shows AI players in separate section
   - [ ] Updates when new players join
   - [ ] Disappears when voting starts

4. **Voting Flow:**
   - [ ] Can start voting from SETUP phase
   - [ ] Cards visible and clickable
   - [ ] Vote selection visible
   - [ ] "Reveal Cards" button enables after voting
   - [ ] Results show correctly after reveal

5. **Real-time Sync:**
   - [ ] New players appear across all browsers
   - [ ] Phase changes sync across browsers
   - [ ] Vote updates sync across browsers
   - [ ] AI votes appear automatically

6. **AI Integration:**
   - [ ] Can add AI teammates
   - [ ] AI votes appear automatically in VOTING phase
   - [ ] Different personas give varied estimates

7. **Results:**
   - [ ] Average score calculated correctly
   - [ ] Agreement percentage accurate
   - [ ] Bar chart shows correct distribution
   - [ ] Most voted card highlighted

### Multi-Browser Testing

Test with 2+ browsers on the same room URL:
1. **Browser A**: Start game → Vote → Reveal
2. **Browser B**: Should see results simultaneously
3. **Browser A**: Click "Next Round"
4. **Browser B**: Should see VOTING phase immediately

---

## Important Notes & Conventions

### Code Conventions

1. **File Naming:**
   - Components: PascalCase (e.g., `Card.jsx`, `PlayerAvatar.jsx`)
   - Hooks: camelCase with `use` prefix (e.g., `useSupabaseRoom.tsx`)
   - Utilities: camelCase (e.g., `utils.ts`, `supabase.ts`)

2. **Component Exports:**
   - Use named exports for components: `export function Card() {}`
   - Avoid default exports for components

3. **Type Safety:**
   - Use TypeScript for new files
   - Define interfaces for complex objects
   - Use proper type annotations

4. **CSS Styling:**
   - Use Tailwind CSS utility classes
   - Avoid inline styles
   - Custom styles in `index.css` only

5. **Environment Variables:**
   - All sensitive data in `.env` (not committed)
   - Use `.env.example` as template
   - Access via `import.meta.env.VITE_*`

### Common Patterns

1. **Async/Await:** Always use try-catch for database operations
2. **State Updates:** Use functional updates when depending on previous state
3. **Effect Dependencies:** Include all referenced variables in dependency array
4. **Cleanup:** Unsubscribe from realtime in useEffect cleanup function

### Supabase Realtime Best Practices

1. **Filter subscriptions:** Use `filter` to limit events (performance)
2. **Handle all event types:** INSERT, UPDATE, DELETE for full sync
3. **Unique IDs:** Use composite IDs for votes (room_id-player_id)
4. **Immediate state updates:** Update local state before waiting for database

### Debugging

1. **Check console logs:**
   - `Room UPDATE received:` - Phase change sync
   - `Updating phase to:` - Phase change trigger
   - Subscription status should be `SUBSCRIBED`

2. **Check network requests:**
   - Look for failed Supabase requests
   - Verify realtime WebSocket connection

3. **Database verification:**
   ```sql
   SELECT * FROM rooms WHERE id = 'your-room-id';
   SELECT * FROM players WHERE room_id = 'your-room-id';
   SELECT * FROM votes WHERE room_id = 'your-room-id';
   ```

---

## Known Issues & Limitations

1. **Tailwind CDN:** Using CDN in development (should use PostCSS for production)
2. **Chart warnings:** Width/height warnings in console (cosmetic, charts still work)
3. **No persistence:** Game data not saved to database history (could be added)
4. **No authentication:** Anonymous users only (could be added)
5. **Browser support:** Requires modern browser with WebSocket support

---

## Deployment Notes

### Environment Variables Required

```env
VITE_SUPABASE_URL=your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key  # Optional
```

### Build Output

```bash
npm run build
# Output in dist/
```

### Recommended Deployment Platforms

- **Vercel** - Simplest for frontend
- **Netlify** - Good alternative
- **Render** - Full-stack support

---

## Troubleshooting

### Phase not syncing across browsers

**Cause:** Realtime subscription not receiving updates

**Solution:**
1. Verify realtime is enabled in Supabase
2. Check console for subscription status
3. Ensure filter is correct: `filter: \`id=eq.${roomId}\``

### Votes not clearing on "Next Round"

**Cause:** Local state not updated immediately

**Solution:**
- `updatePhase` should set local state immediately:
  ```typescript
  setRoomState(prev => ({
    ...prev,
    phase,
    votes: phase === GamePhase.VOTING ? {} : prev.votes
  }));
  ```

### Username not persisting

**Cause:** localStorage not being saved or loaded

**Solution:**
- Check if `localStorage.getItem('poker_username')` returns value
- Ensure username is being saved after submission
- Check for localStorage quota exceeded

### AI votes not appearing

**Cause:** `VITE_GEMINI_API_KEY` not set or invalid

**Solution:**
- Verify API key in `.env`
- Check if Gemini service is reachable
- Check console for AI generation errors

---

## Future Improvements

Potential enhancements to consider:

1. **Features:**
   - Game history and replay
   - Player authentication
   - Room owner permissions
   - Timer for voting rounds
   - Chat functionality

2. **Technical:**
   - Move from Tailwind CDN to PostCSS
   - Add comprehensive error handling
   - Implement optimistic updates
   - Add unit tests with Vitest
   - Add E2E tests with Playwright

3. **UX:**
   - Animations for card reveals
   - Sound effects for actions
   - Dark mode toggle
   - Mobile app (React Native)

---

## Contact & Support

For issues or questions, refer to the project repository or contact the development team.
