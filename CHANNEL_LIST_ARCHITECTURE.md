# CategoriesList Component Architecture Documentation

This document provides a comprehensive understanding of how the CategoriesList component works internally, including data flow, real-time updates, sorting, and component hierarchy.

## Component Hierarchy & Data Flow

```
CategoriesList (Enhanced)
├── CategoriesList (Base Component)
│   ├── ChannelListHeader (Team/Server info)
│   ├── SubHeader (Search & filters)
│   ├── ThreadsButton (CRT threads)
│   ├── DraftsButton (Drafts & scheduled posts)
│   └── Categories (Main channel categories)
│       ├── CategoryHeader (Collapsible category headers)
│       │   ├── Favorites
│       │   ├── Channels (Public/Private)
│       │   └── Direct Messages
│       ├── CategoryBody (Channel list within category)
│       │   └── ChannelItem (Individual channels)
│       └── UnreadCategories (Unread channels section)
│           └── ChannelItem (Individual unread channels)
└── Database Enhancement Layer (RxJS Observables)
```

## Data Flow & Real-Time Updates

### 1. Database Observables (Real-time reactive data)
- CategoriesList is enhanced with `withDatabase` + `withObservables`
- Creates reactive streams that update when database changes

### 2. Current Team Observation
```typescript
observeCurrentTeamId(database) → Reactive stream of current team ID
```
- Updates when user switches teams
- Triggers cascade of dependent queries

### 3. Categories Observation
```typescript
currentTeamId → queryCategoriesByTeamIds(database, [teamId]).observeWithColumns(['sort_order'])
```
- Fetches categories for current team
- Observes 'sort_order' column for real-time sorting updates
- Returns CategoryModel[] with reactive updates

### 4. Unreads Preference Observation
```typescript
const unreadsOnTopUserPreference = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS)
const unreadsOnTopServerPreference = observeConfigBooleanValue(database, 'ExperimentalGroupUnreadChannels')

const unreadsOnTop = unreadsOnTopServerPreference.pipe(
    combineLatestWith(unreadsOnTopUserPreference),
    switchMap(([s, u]) => {
        if (!u) return of$(s);
        return of$(u !== 'false');
    })
);
```
- Combines user preference with server setting
- Updates UI when preferences change

### 5. Drafts & Scheduled Posts
```typescript
observeDraftCount(database, teamId) → Real-time draft count
observeScheduledPostsForTeam(database, teamId) → Scheduled posts
```
- Updates badges and button visibility

## Sorting & Filtering Logic

### 1. Category Sorting (by sort_order)
Categories are sorted by their `sort_order` field from database:
- Favorites (lowest sort_order)
- Public Channels
- Private Channels
- Direct Messages (highest sort_order)

### 2. Channel Sorting within categories
Channels are sorted by `last_post_at` (most recent first)
Unread channels can be grouped at top based on preferences

### 3. Unread Channels Filtering
```typescript
queryMyChannelUnreads(database, teamId) → Channels with unread messages
observeChannelsByLastPostAt(database, channels) → Sort by last post time
```

### 4. Unreads on Top Logic
```typescript
unreadsOnTop = serverConfig || userPreference
```
- If true: Unread channels appear at top of each category
- If false: Unread channels mixed with read channels by last_post_at

## Real-Time Update Mechanisms

### 1. WebSocket Events (Server → Client)
- Channel updates (new messages, channel creation/deletion)
- Category updates (category creation, sort order changes)
- User status updates
- Triggers database updates via operators

### 2. Database Operators (Atomic updates)
```typescript
ServerDataOperator handles batch updates
- prepareChannels() → Updates channel records
- prepareCategoriesAndCategoriesChannels() → Updates categories
- Atomic transactions ensure consistency
```

### 3. RxJS Observables (Reactive streams)
- All data is reactive via RxJS observables
- Components re-render automatically when data changes
- Memory efficient with proper subscription cleanup

### 4. Device Events (Local state changes)
```typescript
DeviceEventEmitter for local state changes
- Active screen changes (Channel/Draft/Thread screens)
- Category collapse/expand state
- Performance metrics tracking
```

## Performance Optimizations

### 1. Virtual Scrolling
```typescript
FlatList with strictMode for efficient rendering
- Only renders visible items
- Proper key extraction for recycling
```

### 2. Selective Re-renders
```typescript
useMemo for expensive computations
- Category sorting logic
- Channel filtering logic
- Button visibility calculations
```

### 3. Animated Values
```typescript
react-native-reanimated for smooth animations
- Category collapse/expand animations
- Tablet width transitions
- Loading states
```

### 4. Lazy Loading
```typescript
initialNumToRender limits initial render count
- Improves app startup performance
- Categories load progressively
```

## Component Props & Configuration

### Required Props (passed from parent):
- `hasChannels: boolean` - Controls error state vs list display
- `moreThanOneTeam: boolean` - Affects tablet layout width

### Optional Props:
- `isCRTEnabled: boolean` - Shows/hides Threads button
- `iconPad: boolean` - Adds padding for header icons

### Injected Props (from database observables):
- `categories: CategoryModel[]` - Current team categories
- `onlyUnreads: boolean` - Show only unread categories mode
- `unreadsOnTop: boolean` - Group unread channels at top
- `draftsCount: number` - Draft messages count
- `scheduledPostCount: number` - Scheduled posts count
- `scheduledPostHasError: boolean` - Scheduled post error state
- `lastChannelId: string` - Last viewed channel for tablet navigation
- `scheduledPostsEnabled: boolean` - Scheduled posts feature enabled

## Integration Points

### 1. Theme System
```typescript
useTheme() hook for consistent styling
Dynamic color changes based on theme
```

### 2. Internationalization
```typescript
useIntl() for localized strings
Category names translated based on user locale
```

### 3. Tablet Optimizations
```typescript
useIsTablet() for responsive layout
Different behavior on tablet vs phone
```

### 4. Performance Monitoring
```typescript
PerformanceMetricsManager tracks key metrics
- Channel switch times
- Team switch performance
- Component load times
```

## Error Handling & Edge Cases

### 1. No Channels State
```typescript
LoadChannelsError component when hasChannels=false
Clean error UI with retry options
```

### 2. Team Switching
```typescript
Loading states during team transitions
Prevents UI glitches during switches
```

### 3. Database Connection Issues
```typescript
Graceful fallbacks when database unavailable
Error boundaries for component failures
```

### 4. Memory Management
```typescript
Proper subscription cleanup in useEffect
Prevents memory leaks in long-running app sessions
```

## How New Chat Messages Update the List

1. **WebSocket Event** → Server sends channel update
2. **Database Update** → Operator updates channel's `last_post_at`
3. **RxJS Observable** → CategoriesList re-renders with new sort order
4. **UI Update** → Channel moves to top of category if `last_post_at` changed

## How Data Gets Real-Time Updates

The component uses **reactive programming** with RxJS:

```typescript
// Example: Categories update reactively
const categories$ = currentTeamId$.pipe(
    switchMap(teamId => queryCategoriesByTeamIds(database, [teamId]).observeWithColumns(['sort_order']))
);

// Component re-renders automatically when categories$ emits new value
```

This ensures the UI stays perfectly synchronized with the database without manual refresh calls.

## WebSocket Integration & Real-Time Updates

### WebSocket Connection Architecture

The CategoriesList component uses **WebSocket connections** for real-time updates from the server, creating a sophisticated reactive architecture that combines WebSocket events with database observables.

#### WebSocket Manager (`websocket_manager.ts`)
```typescript
// Creates WebSocket client for each server
const client = new WebSocketClient(serverUrl, bearerToken, preauthSecret);
client.setEventCallback((evt: WebSocketMessage) => handleWebSocketEvent(serverUrl, evt));
```

#### WebSocket Event Handling (`actions/websocket/event.ts`)
The system listens for these WebSocket events:
- **`POSTED`** / **`POST_EDITED`** / **`POST_DELETED`** - New messages
- **`CHANNEL_CREATED`** / **`CHANNEL_DELETED`** - Channel changes
- **`CATEGORY_CREATED`** / **`CATEGORY_UPDATED`** - Category changes
- **`USER_ADDED`** / **`USER_REMOVED`** - Channel membership changes

#### Real-Time Data Flow for New Messages:

```
📡 WebSocket Event (POSTED)
    ↓
🔄 handleNewPostEvent() - Processes new post
    ↓
💾 updateLastPostAt() - Updates channel.last_post_at in database
    ↓
📊 RxJS Observable - CategoriesList re-renders automatically
    ↓
🎯 Channel moves to top of category (sorted by last_post_at)
```

### How Real-Time Updates Work

#### Database Observables with `observeWithColumns()`
```typescript
// Categories observe 'sort_order' column changes
const categories = currentTeamId.pipe(
    switchMap(teamId => queryCategoriesByTeamIds(database, [teamId])
        .observeWithColumns(['sort_order']))
);

// Channels observe 'last_post_at' changes
const channels = category.channels.observeWithColumns(['create_at', 'display_name']);
```

#### Automatic UI Updates
When `last_post_at` changes in the database:
1. **RxJS Observable emits new value**
2. **CategoriesList component re-renders**
3. **Channels automatically re-sort** by `last_post_at` timestamp
4. **Newest messages appear at top** of each category

### Key Real-Time Features

#### Instant Message Appearance
- New messages appear instantly in channel list
- Channels with new activity bubble to top
- No manual refresh needed

#### Category Management
- New channels appear in correct categories instantly
- Category reordering reflects immediately
- Channel archiving/removal updates in real-time

#### User Status & Presence
- Online/offline status updates via WebSocket
- Typing indicators (if enabled)
- User role changes

#### Cross-Device Sync
- Changes on web/desktop sync to mobile instantly
- Consistent state across all devices

### Technical Implementation Details

#### WebSocket Event Processing
```typescript
// When a new post arrives:
1. Parse WebSocket message
2. Update channel.last_post_at timestamp
3. Database triggers observable emission
4. UI re-renders with new sort order
```

#### Memory Management
- Proper subscription cleanup in `useEffect`
- Background timer management for connection handling
- Efficient observable unsubscribing

#### Error Handling
- WebSocket reconnection logic
- Graceful degradation when offline
- Retry mechanisms for failed operations

### Performance Optimizations

#### Selective Column Observation
```typescript
.observeWithColumns(['sort_order', 'last_post_at'])
```
- Only observes specific columns that affect sorting
- Minimizes unnecessary re-renders

#### Virtual Scrolling
- FlatList with `strictMode` for efficient rendering
- Only renders visible channels

#### Debounced Updates
- Prevents excessive re-renders during rapid updates
- Batched database operations for efficiency

### Result: Real-Time Channel List

The CategoriesList provides a **truly real-time experience** where:
- ✅ **New messages appear instantly**
- ✅ **Channels reorder automatically**
- ✅ **No manual refresh needed**
- ✅ **Consistent across all devices**
- ✅ **Efficient and performant**

This is achieved through the powerful combination of **WebSocket real-time events** + **reactive database observables** + **intelligent component architecture**!
