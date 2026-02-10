# How Gemini Planning Poker Works

## Overview

Gemini Planning Poker is a real-time collaborative application that uses **Supabase** for database storage and real-time synchronization between clients. The app follows a client-server architecture where:

- **Client** (React app) manages local UI state
- **Supabase** provides PostgreSQL database and WebSocket-based real-time subscriptions
- All state changes are propagated to connected clients via Supabase Realtime

---

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Client A      │         │    Supabase      │         │   Client B      │
│  (Browser)      │◄────────┤  PostgreSQL +    │────────►│  (Browser)      │
│                 │ Realtime│     Realtime     │ Realtime│                 │
│  ┌───────────┐  │  WebSocket               │         │  ┌───────────┐  │
│  │ React UI  │  │         │  ┌────────────┐ │         │  │ React UI  │  │
│  │           │  │         │  │  rooms     │ │         │  │           │  │
│  │ Local     │  │         │  │  players   │ │         │  │ Local     │  │
│  │ State     │  │         │  │  votes     │ │         │  │ State     │  │
│  └───────────┘  │         │  └────────────┘ │         │  └───────────┘  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                                                          │
         │ ┌────────────────────────────────────────────────────┐  │
         │ │              useSupabaseRoom Hook                   │  │
         │ │  - Manages local React state                        │  │
         │ │  - Subscribes to Supabase Realtime                  │  │
         │ │  - Writes to Supabase on user actions               │  │
         │ │  - Updates local state on realtime events           │  │
         │ └────────────────────────────────────────────────────┘  │
         └──────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

```sql
-- rooms: Stores game state for each room
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  story_title TEXT,
  story_description TEXT,
  phase TEXT,              -- SETUP | VOTING | REVEALED
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- players: Tracks all players in a room
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES rooms(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,      -- HUMAN | AI
  avatar_url TEXT NOT NULL,
  persona TEXT,            -- AI persona description
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- votes: Records votes for the current round
CREATE TABLE votes (
  id TEXT PRIMARY KEY,     -- Composite: room_id-player_id
  room_id TEXT REFERENCES rooms(id),
  player_id TEXT REFERENCES players(id),
  value TEXT NOT NULL,     -- Card value (1, 2, 3, 5, 8, 13, 21, ?)
  reasoning TEXT,          -- AI reasoning (for AI votes only)
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(room_id, player_id)
);
```

---

## Supabase Interaction Flow

### 1. Application Initialization

**When:** App first loads (in `useSupabaseRoom` useEffect)

**Sequence:**
```
1. Get or generate persistent user ID from localStorage
2. Create currentUser object
3. Load room data from Supabase:
   - Fetch room (or create if doesn't exist)
   - Fetch all players in room
   - Fetch all votes in room
   - Add current user to players table if not already present
4. Set up Realtime subscriptions for:
   - rooms table (UPDATE events)
   - players table (INSERT, DELETE events)
   - votes table (INSERT, UPDATE, DELETE events)
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:36-53`

```typescript
// Get or generate persistent user ID
let userId = localStorage.getItem(`poker_user_id_${roomId}`);
if (!userId) {
  userId = generateId();
  localStorage.setItem(`poker_user_id_${roomId}`, userId);
}

// Load room data
loadRoomData(roomId, currentUserData.id, currentUserData);

// Subscribe to realtime changes
supabase.channel(roomChannel)
  .on('postgres_changes', { event: 'UPDATE', table: 'rooms' }, ...)
  .on('postgres_changes', { event: '*', table: 'players' }, ...)
  .on('postgres_changes', { event: '*', table: 'votes' }, ...)
  .subscribe();
```

---

### 2. Realtime Subscriptions

**When:** After initial data load, stays active until user leaves

**Tables Subscribed:**

| Table | Events | Trigger | Local State Update |
|-------|--------|---------|-------------------|
| `rooms` | UPDATE | Phase/story change | Update `roomState.phase` and `roomState.story` |
| `players` | INSERT | New player joins | Add to `roomState.players` |
| `players` | DELETE | Player leaves | Remove from `roomState.players` and `roomState.votes` |
| `votes` | INSERT | Vote cast | Add/update `roomState.votes` |
| `votes` | UPDATE | Vote updated | Update `roomState.votes` |
| `votes` | DELETE | Vote cleared | Remove from `roomState.votes` |

**Code Reference:** `hooks/useSupabaseRoom.tsx:58-147`

```typescript
// Room phase changes
.on('postgres_changes', {
  event: 'UPDATE',
  table: 'rooms',
  filter: `id=eq.${roomId}`
}, (payload) => {
  setRoomState(prev => ({
    ...prev,
    phase: payload.new.phase,
    story: { title: payload.new.story_title, description: payload.new.story_description }
  }));
})

// Player joins/leaves
.on('postgres_changes', {
  event: '*',
  table: 'players',
  filter: `room_id=eq.${roomId}`
}, (payload) => {
  if (payload.eventType === 'INSERT') {
    setRoomState(prev => ({
      ...prev,
      players: [...prev.players, payload.new]
    }));
  } else if (payload.eventType === 'DELETE') {
    setRoomState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== payload.old.id)
    }));
  }
})
```

---

### 3. Phase Transitions

**When:** User clicks "Start", "Reveal Cards", or "Next Round"

**Sequence:**
```
1. Update local state IMMEDIATELY (for UI responsiveness)
2. Write to Supabase rooms table
3. Supabase broadcasts UPDATE event to all subscribed clients
4. All clients update their local state
```

**Phase Flow:**
```
SETUP → VOTING → REVEALED → VOTING (next round)
   ↓        ↓          ↓
Create   Clear     Show
Room     Votes     Results
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:261-281`

```typescript
const updatePhase = async (phase: GamePhase) => {
  // 1. Update local state immediately
  setRoomState(prev => ({
    ...prev,
    phase,
    votes: phase === GamePhase.VOTING ? {} : prev.votes
  }));

  // 2. Update database
  await supabase.from('rooms').update({ phase }).eq('id', roomId);

  // 3. If starting new round, clear votes
  if (phase === GamePhase.VOTING) {
    await supabase.from('votes').delete().eq('room_id', roomId);
  }

  // 4. Supabase broadcasts UPDATE to all clients
  // 5. All clients receive event and update local state
};
```

**Why Update Local State First?**
- Provides immediate UI feedback (no network delay)
- Prevents race conditions if multiple users click simultaneously
- Ensures the initiating user sees their change instantly

---

### 4. Voting Flow

#### Human Voting

**When:** Player clicks a card in VOTING phase

**Sequence:**
```
1. User clicks card
2. Upsert vote to Supabase votes table
3. Supabase broadcasts INSERT/UPDATE event
4. All clients add/update vote in local state
5. UI updates to show vote (hidden until REVEALED)
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:345-355`

```typescript
const handleVote = async (value: number | string) => {
  await supabase.from('votes').upsert({
    id: `${roomId}-${currentUser.id}`,  // Composite ID
    room_id: roomId,
    player_id: currentUser.id,
    value: value.toString(),
    reasoning: undefined  // Humans don't provide reasoning
  });
};
```

#### AI Voting

**When:** Phase changes to VOTING and AI players exist

**Sequence:**
```
1. Phase changes to VOTING
2. useEffect detects VOTING phase and AI players
3. For each AI player:
   a. Wait random delay (1-4 seconds) for natural behavior
   b. Call Gemini AI to get vote and reasoning
   c. Upsert vote to Supabase votes table with reasoning
4. All clients see AI votes appear in real-time
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:304-343`

```typescript
// Trigger AI votes when phase changes to VOTING
useEffect(() => {
  if (roomState.phase === GamePhase.VOTING) {
    const aiPlayers = roomState.players.filter(p => p.type === UserType.AI);
    if (aiPlayers.length > 0 && !isProcessingAI) {
      triggerAiVotes();
    }
  }
}, [roomState.phase, roomState.players, roomState.votes, isProcessingAI, triggerAiVotes]);

const triggerAiVotes = async () => {
  for (const player of aiPlayers) {
    // Natural delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000));

    // Get AI vote from Gemini
    const result = await generateAiVote(roomState.story, persona.name, persona.role);

    // Save to Supabase
    await supabase.from('votes').upsert({
      id: `${roomId}-${player.id}`,
      room_id: roomId,
      player_id: player.id,
      value: result.points.toString(),
      reasoning: result.reasoning  // AI provides reasoning
    });
  }
};
```

---

#### Reveal Cards

**When:** Any user clicks the "Reveal Cards" button (only visible when all players have voted)

**Sequence:**
```
1. User clicks "Reveal Cards" button
2. Initiating client updates local phase to REVEALED immediately
3. Initiating client updates phase in Supabase rooms table
4. Supabase broadcasts UPDATE event to all subscribed clients
5. All clients receive phase update and update local state to REVEALED
6. All clients:
   - Show all vote cards (previously hidden)
   - Display ResultsChart with statistics
   - Calculate average score, agreement percentage, most voted card
   - Show "Next Round" button
```

**UI Changes on Reveal:**

| Element | VOTING Phase | REVEALED Phase |
|---------|--------------|----------------|
| Vote Cards | Hidden (facedown) | Visible (faceup with values) |
| Reveal Button | Visible when all voted | Hidden |
| ResultsChart | Hidden | Visible with bar chart |
| Statistics | Hidden | Visible (avg, agreement, consensus) |
| Next Round Button | Hidden | Visible |
| Card Deck | Clickable | Disabled |

**Code Reference:** `App.tsx:186-202` (Reveal button) and `hooks/useSupabaseRoom.tsx:261-281` (Phase update)

```typescript
// App.tsx - Reveal button
<button
  onClick={() => updatePhase(GamePhase.REVEALED)}
  disabled={!allVoted}
  className={allVoted ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 cursor-not-allowed'}
>
  <PlayCircle size={24} />
  {allVoted ? 'Reveal Cards' : 'Waiting...'}
</button>

// Phase update handles reveal
const updatePhase = async (phase: GamePhase) => {
  // Update local state immediately
  setRoomState(prev => ({
    ...prev,
    phase: GamePhase.REVEALED
  }));

  // Update database - triggers realtime broadcast
  await supabase.from('rooms').update({ phase: GamePhase.REVEALED }).eq('id', roomId);
};
```

**ResultsChart Display:**

When phase becomes REVEALED, the `ResultsChart` component renders with:
```typescript
{roomState.phase === GamePhase.REVEALED && (
  <div className="mb-12 animate-flip-in">
    <ResultsChart votes={roomState.votes} />
  </div>
)}
```

**Statistics Calculated:**
- **Average score:** Mean of all numeric votes (? excluded)
- **Agreement %:** Percentage of players who voted for the most common value
- **Consensus:** 100% = unanimous agreement
- **Most voted:** The card value with the highest frequency

**Visual Effects:**
- Cards flip with animation (`animate-flip-in`)
- Results chart slides in from bottom
- AI reasoning tooltips appear on hover over AI votes

---

#### Next Round

**When:** Any user clicks the "Next Round" button (only visible in REVEALED phase)

**Sequence:**
```
1. User clicks "Next Round" button
2. Initiating client clears story title and description (if any)
3. Initiating client updates local phase to VOTING immediately
4. Initiating client clears local votes (resets to empty object)
5. Initiating client updates phase in Supabase rooms table
6. Supabase broadcasts UPDATE event to all subscribed clients
7. Supabase deletes all votes from votes table for this room
8. All clients receive phase update and update local state to VOTING
9. All clients:
   - Hide ResultsChart
   - Hide revealed vote cards
   - Show voting deck (cards become clickable again)
   - AI players start voting again (with random delays)
```

**Difference from "Re-vote":**

| Action | Story Content | Votes Cleared | Phase | AI Re-votes |
|--------|--------------|---------------|-------|------------|
| **Re-vote** | Preserved | Cleared | VOTING | Yes |
| **Next Round** | Cleared | Cleared | VOTING | Yes |

**UI Changes on Next Round:**

| Element | REVEALED Phase | VOTING Phase (after Next Round) |
|---------|----------------|--------------------------------|
| Story Title | Visible with value | Cleared/Empty |
| Story Description | Visible with value | Cleared/Empty |
| Vote Cards | Visible with values | Hidden (facedown) |
| ResultsChart | Visible with bar chart | Hidden |
| Statistics | Visible (avg, agreement) | Hidden |
| Next Round Button | Visible | Hidden |
| Card Deck | Disabled | Clickable |
| Re-vote Button | Visible | Hidden |

**Code Reference:** `App.tsx:48-51` (resetGame function), `components/StoryPanel.jsx:80-86` (Next Round button), `hooks/useSupabaseRoom.tsx:261-281` (Phase update with vote clearing)

```typescript
// App.tsx - Next Round handler
const resetGame = () => {
  updateStory({ title: '', description: '' });  // Clear story
  updatePhase(GamePhase.VOTING);                 // Start new round
};

// StoryPanel.jsx - Next Round button
<button
  onClick={onReset}
  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg"
>
  <RefreshCw size={18} />
  Next Round
</button>

// Phase update clears votes
const updatePhase = async (phase: GamePhase) => {
  // Update local state immediately
  setRoomState(prev => ({
    ...prev,
    phase: GamePhase.VOTING,
    votes: {}  // Clear votes locally
  }));

  // Update database
  await supabase.from('rooms').update({ phase: GamePhase.VOTING }).eq('id', roomId);

  // Clear votes from database
  await supabase.from('votes').delete().eq('room_id', roomId);
};
```

**Use Case:**
- **Next Round** is used when moving to a completely new topic/story
- Clears both votes AND story content
- Gives everyone a fresh start for a new estimation session

**AI Behavior After Next Round:**
- Same as initial VOTING phase
- AI players detect phase change to VOTING
- Each AI votes with random 1-4 second delays
- AI reasoning is generated fresh for the new (empty) story

---

#### Re-vote

**When:** Any user clicks the "Re-vote" button (only visible in REVEALED phase)

**Sequence:**
```
1. User clicks "Re-vote" button
2. Initiating client updates local phase to VOTING immediately
3. Initiating client clears local votes
4. Initiating client updates phase in Supabase rooms table
5. Supabase broadcasts UPDATE event to all subscribed clients
6. Supabase deletes all votes from votes table for this room
7. All clients receive phase update and update local state to VOTING
8. All clients:
   - Hide ResultsChart and revealed vote cards
   - Show voting deck (cards become clickable)
   - Keep the same story title and description
   - AI players re-vote on the same story
```

**Code Reference:** `App.tsx:44-46` (restartRound function), `components/StoryPanel.jsx:72-79` (Re-vote button)

```typescript
// App.tsx - Re-vote handler
const restartRound = () => {
  updatePhase(GamePhase.VOTING);  // Restart voting on same story
};

// StoryPanel.jsx - Re-vote button
<button
  onClick={onRevote}
  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-600 text-sm"
  title="Clear votes and vote again on this topic"
>
  <RotateCcw size={16} />
  Re-vote
</button>
```

**Use Case:**
- **Re-vote** is used when team wants to re-estimate the same topic
- Preserves story content for context
- Common when:
  - New information is revealed
  - Team disagrees with initial estimate
  - Need more discussion before re-voting

---

### 5. Player Management

#### Joining a Room

**When:** User navigates to a room (new or existing)

**Sequence:**
```
1. Check if room exists in Supabase
2. If not, create room
3. Insert player into players table
4. Other clients receive INSERT event
5. Other clients update their player list
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:224-248`

```typescript
const joinRoom = async (rid: string, userId: string, user: Player) => {
  // Ensure room exists
  const { data: existingRoom } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', rid)
    .maybeSingle();

  if (!existingRoom) {
    await supabase.from('rooms').insert({
      id: rid,
      story_title: '',
      story_description: '',
      phase: GamePhase.SETUP
    });
  }

  // Add player
  await supabase.from('players').insert({
    room_id: rid,
    id: userId,
    name: user.name,
    type: user.type,
    avatar_url: user.avatarUrl,
    persona: user.persona
  });
};
```

#### Adding AI Players

**When:** User clicks "Add AI" button

**Sequence:**
```
1. Select 3 random AI personas from list
2. For each persona:
   a. Check if already in room
   b. If not, insert into players table with type=AI
3. Other clients receive INSERT events
4. Other clients update their player list
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:283-302`

```typescript
const addAiPlayers = async () => {
  const shuffled = [...AI_PERSONAS].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  for (const persona of selected) {
    await supabase.from('players').insert({
      room_id: roomId,
      id: persona.id,
      name: persona.name,
      type: UserType.AI,
      avatar_url: `https://picsum.photos/100/100?random=${persona.avatarSeed}`,
      persona: persona.description
    });
  }
};
```

#### Leaving a Room

**When:** User closes the tab or navigates away

**Sequence:**
```
1. useEffect cleanup function triggers
2. Delete player from players table
3. Other clients receive DELETE event
4. Other clients remove player from their list
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:149-152`

```typescript
// Cleanup on unmount
return () => {
  roomSubscription.unsubscribe();
  leaveRoom(roomId, currentUserData.id);
};

const leaveRoom = async (rid: string, userId: string) => {
  await supabase.from('players').delete().eq('room_id', rid).eq('id', userId);
};
```

---

### 6. Story Updates

**When:** User updates story title or description

**Sequence:**
```
1. User types in StoryPanel
2. Debounced update (or on blur)
3. Update Supabase rooms table
4. Supabase broadcasts UPDATE event
5. All clients update their story display
```

**Code Reference:** `hooks/useSupabaseRoom.tsx:254-259`

```typescript
const updateStory = async (story: { title: string; description: string }) => {
  await supabase
    .from('rooms')
    .update({ story_title: story.title, story_description: story.description })
    .eq('id', roomId);
};
```

---

## Complete Data Flow Example

### Scenario: 3 Users Play a Round

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   User A     │      │   User B     │      │   User C     │
│  (Initiator) │      │              │      │              │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │ 1. Join Room        │                     │
       ├─────────────────────►                     │
       │ 2. Create Room      │                     │
       ├─────────────────────────────────────────►│
       │ 3. Join Room        │                     │
       │ ◄───────────────────┤                     │
       │                     │ 4. Join Room        │
       │ ◄─────────────────────────────────────────┤
       │                     │                     │
       │ 5. Add AI Players   │                     │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 6. AI Insert Event  │
       │ ◄─────────────────────────────────────────┤
       │                     │                     │
       │ 7. Click Start      │                     │
       │ 8. Update Local State                      │
       │ 9. Update Phase(VOTING) in Supabase        │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 10. Phase Update    │
       │ ◄─────────────────────────────────────────┤
       │ 11. Clear Votes in Supabase                │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 12. Votes Cleared   │
       │ ◄─────────────────────────────────────────┤
       │                     │                     │
       │ 13. AI Starts Voting                      │
       │ 14. AI 1 Vote (delayed)                   │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 15. Vote Insert     │
       │ ◄─────────────────────────────────────────┤
       │ 16. AI 2 Vote                              │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 17. Vote Insert     │
       │ ◄─────────────────────────────────────────┤
       │ 18. AI 3 Vote                              │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 19. Vote Insert     │
       │ ◄─────────────────────────────────────────┤
       │                     │                     │
       │ 20. User A Votes    │ 21. User B Votes    │
       ├─────────────────────►│ 22. Upsert Vote     │
       │ ◄───────────────────┼─────────────────────►│
       │ 23. Vote Insert     │ ◄───────────────────┤
       │ ◄─────────────────────────────────────────┤
       │ 24. User C Votes                           │
       │ ◄─────────────────────────────────────────┤
       │                     │                     │
       │ 25. Click Reveal    │                     │
       │ 26. Update Local State                      │
       │ 27. Update Phase(REVEALED) in Supabase     │
       ├─────────────────────►                     │
       │ ◄───────────────────┤ 28. Phase Update    │
       │ ◄─────────────────────────────────────────┤
       │ 29. Show Results    │                     │
       │                     │                     │
```

---

## Key Design Decisions

### 1. Immediate Local State Updates

**Decision:** Update local React state before waiting for Supabase

**Why:**
- Provides instant UI feedback
- No perceived latency for the initiating user
- Prevents duplicate updates

**Trade-off:**
- If Supabase write fails, local state could be inconsistent
- Mitigated by using supabase.js error handling

### 2. Composite Vote IDs

**Decision:** Vote ID = `${room_id}-${player_id}`

**Why:**
- Guarantees one vote per player per round
- Simplifies upsert logic (no need to check for existing votes)
- Allows easy lookup by player ID

### 3. Supabase Realtime vs. Custom WebSocket

**Decision:** Use Supabase Realtime subscriptions

**Why:**
- No need to maintain separate WebSocket server
- Built-in PostgreSQL integration
- Automatic connection management
- Filter subscriptions by room for efficiency

### 4. Phase-Based Vote Clearing

**Decision:** Clear votes when phase changes to VOTING

**Why:**
- Ensures fresh start for each round
- Simple state management
- All clients sync automatically via phase update

### 5. AI Vote Delays

**Decision:** Random 1-4 second delays for AI votes

**Why:**
- More natural user experience
- Simulates human thinking time
- Prevents all AI votes appearing simultaneously

---

## Performance Optimizations

### 1. Subscription Filtering

```typescript
// Only receive events for this specific room
filter: `room_id=eq.${roomId}`
```

### 2. Upsert Instead of Check-Then-Insert

```typescript
// Insert or update in one operation
await supabase.from('votes').upsert({ ... });
```

### 3. Minimal Data Fetching

```typescript
// Only fetch columns needed
.from('players')
.select('id, name, type, avatar_url, persona')
```

### 4. Local State as Source of Truth

- UI renders from local React state
- Supabase is only for sync
- No re-fetching after updates (realtime handles it)

---

## Error Handling

### Supabase Client Not Initialized

```typescript
if (!supabase) {
  console.error('Supabase client not initialized');
  return;
}
```

### Network Failures

- Supabase client handles retries automatically
- Local state remains functional even with network issues
- Reconnection handled by Supabase Realtime

### Race Conditions

- Immediate local updates prevent most race conditions
- Database constraints (UNIQUE on votes) prevent duplicates
- Optimistic UI updates provide perceived consistency

---

## Security Considerations

### Row-Level Security (RLS)

Not currently implemented but recommended for production:

```sql
-- Only allow users to see/join rooms they're invited to
CREATE POLICY "Users can view rooms they're in"
ON rooms FOR SELECT
USING (
  id IN (SELECT room_id FROM players WHERE id = auth.uid())
);

-- Only allow users to vote for themselves
CREATE POLICY "Users can only vote for themselves"
ON votes FOR INSERT
WITH CHECK (player_id = auth.uid());
```

### Anon Key Exposure

- `VITE_SUPABASE_ANON_KEY` is public by design
- RLS policies restrict what anonymous users can do
- Never expose `service_role` key on client side

---

## Monitoring & Debugging

### Console Logging

```typescript
console.log('Room UPDATE received:', payload.eventType, payload.new);
console.log('Updating phase to:', phase, 'for room:', roomId);
```

### Network Requests

- Check browser DevTools Network tab
- Filter by WebSocket connections
- Look for `wss://` connections to Supabase

### Database Verification

```sql
-- Check room state
SELECT * FROM rooms WHERE id = 'your-room-id';

-- Check connected players
SELECT * FROM players WHERE room_id = 'your-room-id';

-- Check votes
SELECT * FROM votes WHERE room_id = 'your-room-id';
```

---

## Summary

The app works by:

1. **Initializing:** Load data from Supabase and subscribe to realtime updates
2. **User Actions:** Update local state immediately, then write to Supabase
3. **Sync:** Supabase broadcasts changes via WebSocket to all clients
4. **Response:** All clients update their local state and UI

This architecture provides:
- **Real-time collaboration** across all connected clients
- **Immediate UI feedback** for the initiating user
- **Consistent state** across all browsers
- **Scalable design** using Supabase infrastructure
