# Channel List Architecture Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Folder Structure](#folder-structure)
3. [Core Concepts](#core-concepts)
4. [Data Flow & Observable Pattern](#data-flow--observable-pattern)
5. [Channel & Direct Message Logic](#channel--direct-message-logic)
6. [Filtering System](#filtering-system)
7. [Sorting Logic](#sorting-logic)
8. [Category Management](#category-management)
9. [UI Components Breakdown](#ui-components-breakdown)
10. [Key Functions & Utilities](#key-functions--utilities)

---

## Overview

The `/app/screens/home/channel_list` folder contains the **main home screen** of Mattermost Mobile. It displays:
- **Channels** (Public/Private)
- **Direct Messages** (1-on-1)
- **Group Messages** (Multiple users)
- **Categories** (Favorites, Channels, DMs, Custom)
- **Unreads Section** (Optional, based on preference)

### Technology Stack
- **WatermelonDB**: Real-time database with reactive queries
- **RxJS**: Reactive programming for observable streams
- **React Native Reanimated**: Smooth animations
- **React Navigation**: Screen navigation

---

## Folder Structure

```
channel_list/
├── channel_list.tsx                    # Main screen container
├── index.ts                           # Database observable wrapper
├── categories_list/
│   ├── categories_list.tsx            # Category list container
│   ├── index.tsx                      # Enhanced with observables
│   ├── categories/
│   │   ├── categories.tsx             # FlatList of categories
│   │   ├── index.ts                   # Enhanced wrapper
│   │   ├── body/
│   │   │   ├── category_body.tsx      # Channel list per category
│   │   │   └── index.ts               # Enhanced with complex filtering
│   │   ├── header/
│   │   │   ├── header.tsx             # Collapsible category header
│   │   │   └── index.ts               # Enhanced wrapper
│   │   └── unreads/
│   │       ├── unreads.tsx            # Unread channels section
│   │       ├── index.ts               # Enhanced wrapper
│   │       └── empty_state/           # No unreads state
│   ├── header/
│   │   ├── header.tsx                 # Team name + plus button
│   │   ├── index.ts                   # Enhanced wrapper
│   │   ├── loading_unreads.tsx        # Loading indicator
│   │   └── plus_menu/                 # Action menu
│   ├── subheader/
│   │   ├── subheader.tsx              # Search + filter bar
│   │   ├── index.ts                   # Enhanced wrapper
│   │   ├── search_field/              # Find channels button
│   │   └── unread_filter/             # Toggle unreads only
│   ├── load_channels_error/           # Error state
│   └── load_teams_error/              # Error state
├── servers/
│   ├── index.tsx                      # Server switcher icon
│   └── servers_list/                  # Server list bottom sheet
└── additional_tablet_view/            # Tablet split view
```

---

## Core Concepts

### 1. **Categories**
Categories are containers that group channels. Types:
- `favorites` - Favorited channels
- `channels` - Public/Private channels
- `direct_messages` - DMs and GMs
- `custom_category` - User-created categories

### 2. **MyChannel**
Extended channel model that includes user-specific data:
- `lastPostAt` - Last message timestamp
- `lastViewedAt` - When user last viewed
- `isUnread` - Has unread messages
- `mentionsCount` - Number of mentions
- `messageCount` - Unread message count
- `manuallyUnread` - User marked as unread

### 3. **ChannelWithMyChannel**
Combined object used in filtering/sorting:
```typescript
{
  channel: ChannelModel,      // Channel data (name, type, etc.)
  myChannel: MyChannelModel,   // User-specific data
  sortOrder: number            // Manual sort position
}
```

---

## Data Flow & Observable Pattern

### Observable Chain Architecture

```
Database
  ↓
withObservables (HOC)
  ↓ (Reactive Queries)
RxJS Operators (switchMap, combineLatestWith, map)
  ↓ (Transform Data)
Component Props
  ↓ (Render)
UI Components
```

### Example: Category Body Observable Flow

```typescript
// 1. Observe category's myChannels
const categoryMyChannels = category.myChannels
  .observeWithColumns(['last_post_at', 'is_unread']);

// 2. Combine with channels and sort order
const channelsWithMyChannel = observeCategoryChannels(category, categoryMyChannels);
  // Returns: ChannelWithMyChannel[]

// 3. Observe preferences
const notifyPropsPerChannel = categoryMyChannels.pipe(
  switchMap(mc => observeNotifyPropsByChannels(database, mc))
);

// 4. Filter channels
const sortedChannels = channelsWithMyChannel.pipe(
  combineLatestWith(
    categorySorting,
    currentChannelId,
    lastUnreadId,
    notifyPropsPerChannel,
    manuallyClosedPrefs,
    autoclosePrefs,
    deactivatedUsers,
    limit
  ),
  switchMap(([cwms, sorting, channelId, unreadId, notifyProps, ...]) => {
    let filtered = cwms;
    
    // Apply filters
    filtered = filterArchivedChannels(filtered, channelId);
    filtered = filterManuallyClosedDms(filtered, notifyProps, manuallyClosedDms, currentUserId, unreadId);
    filtered = filterAutoclosedDMs(categoryType, maxDms, currentUserId, channelId, filtered, autoclose, notifyProps, deactivatedUsers, unreadId);
    
    // Sort
    return of$(sortChannels(sorting, filtered, notifyProps, locale));
  })
);

// 5. Calculate unread IDs
const unreadIds = channelsWithMyChannel.pipe(
  combineLatestWith(notifyPropsPerChannel, lastUnreadId),
  switchMap(([cwms, notifyProps, unreadId]) => {
    return of$(getUnreadIds(cwms, notifyProps, unreadId));
  })
);

// 6. Return to component
return {
  sortedChannels,
  unreadIds,
  unreadsOnTop,
  category
};
```

---

## Channel & Direct Message Logic

### Channel Types

```typescript
'O' = Open/Public Channel
'P' = Private Channel
'D' = Direct Message (1-on-1)
'G' = Group Message (Multi-user DM)
```

### Direct Message Handling

#### 1. **Display Name Resolution**
```typescript
// For DMs, display name is the other user's name
if (channel.type === 'D') {
  // Fetch user info if not available
  fetchDirectChannelsInfo(serverUrl, dmChannels);
}
```

#### 2. **DM Category (`direct_messages`)**
- Contains all DMs and GMs
- Special filtering rules apply
- Auto-close behavior based on limit

#### 3. **DM Limit Preference**
```typescript
// Default: Show 20 most recent DMs
const limit = Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT; // 20

// User can customize in settings
const userLimit = querySidebarPreferences(
  database,
  Preferences.CHANNEL_SIDEBAR_LIMIT_DMS
);
```

---

## Filtering System

The filtering system has **4 main layers**:

### 1. **Archived Channels Filter**

```typescript
function filterArchivedChannels(
  channels: ChannelWithMyChannel[],
  currentChannelId: string
) {
  return channels.filter(item => {
    const channel = item.channel;
    
    // Keep if:
    // - Not deleted/archived (deleteAt === 0)
    // - OR is currently active channel
    return channel.deleteAt === 0 || channel.id === currentChannelId;
  });
}
```

**Logic**: Hide archived channels UNLESS it's the currently active channel.

---

### 2. **Manually Closed DMs Filter**

```typescript
function filterManuallyClosedDms(
  channels: ChannelWithMyChannel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  manuallyClosedPrefs: PreferenceModel[],
  currentUserId: string,
  lastUnreadChannelId?: string
) {
  return channels.filter(item => {
    const channel = item.channel;
    
    // Only applies to DMs/GMs
    if (!isDMorGM(channel)) {
      return true;
    }
    
    // Check if user manually closed this DM
    const prefKey = channel.type === 'D' 
      ? `${Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW}--${otherUserId}`
      : `${Preferences.CATEGORIES.GROUP_CHANNEL_SHOW}--${channel.id}`;
    
    const pref = manuallyClosedPrefs.find(p => p.name === prefKey);
    
    // Keep if:
    // - Not manually closed (pref.value !== 'false')
    // - OR has unreads
    // - OR is last unread channel
    const isClosed = pref?.value === 'false';
    const hasUnreads = item.myChannel.isUnread || item.myChannel.mentionsCount > 0;
    const isLastUnread = channel.id === lastUnreadChannelId;
    
    return !isClosed || hasUnreads || isLastUnread;
  });
}
```

**Logic**: 
- User can manually hide DMs via "Close Conversation"
- Hidden DMs reappear if they receive new messages
- Last unread channel always shown

---

### 3. **Auto-Closed DMs Filter**

```typescript
function filterAutoclosedDMs(
  categoryType: string,
  limit: number,
  currentUserId: string,
  currentChannelId: string,
  channels: ChannelWithMyChannel[],
  autoclosePrefs: PreferenceModel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  deactivatedUsers?: UserModel[],
  lastUnreadChannelId?: string
) {
  // Only for DM category
  if (categoryType !== DMS_CATEGORY) {
    return channels;
  }
  
  const deactivatedIds = new Set(deactivatedUsers?.map(u => u.id) || []);
  
  return channels.filter(item => {
    const channel = item.channel;
    const myChannel = item.myChannel;
    
    // Always keep current channel
    if (channel.id === currentChannelId) {
      return true;
    }
    
    // Always keep if has unreads
    if (myChannel.isUnread || myChannel.mentionsCount > 0) {
      return true;
    }
    
    // Always keep last unread
    if (channel.id === lastUnreadChannelId) {
      return true;
    }
    
    // Check if DM is with deactivated user
    if (channel.type === 'D') {
      const otherUserId = channel.name.replace(currentUserId, '').replace('__', '');
      if (deactivatedIds.has(otherUserId)) {
        return false; // Hide DMs with deactivated users
      }
    }
    
    // Check autoclose preference
    const cutoff = getCutoffTimestamp(autoclosePrefs, channel);
    
    // Keep if:
    // - Last viewed after cutoff
    // - OR last post after cutoff
    return myChannel.lastViewedAt >= cutoff || 
           myChannel.lastPostAt >= cutoff;
  });
  
  // Then limit to top N most recent
  const sorted = sortByRecent(channels);
  return sorted.slice(0, limit);
}
```

**Logic**:
- Auto-hide DMs that haven't been viewed/posted in X days (default: 7 days)
- Limit to N most recent (default: 20)
- Always show: current, unreads, last unread, non-deactivated

---

### 4. **Unreads-Only Filter**

```typescript
// Applied at Categories level
if (onlyUnreads) {
  // Show only "UNREADS" category
  return ['UNREADS'];
}

// In UnreadCategories component
const unreadChannels = allChannels.filter(channel => {
  return channel.myChannel.isUnread || 
         channel.myChannel.mentionsCount > 0;
});
```

**Logic**: When "Filter" button active, show only channels with unreads.

---

## Sorting Logic

### Sorting Types

```typescript
type SortingType = 
  | 'recent'           // By last post time
  | 'alpha'            // Alphabetically
  | 'manual'           // User-defined order
  | 'combined';        // Server default
```

### Sort Implementation

```typescript
function sortChannels(
  sorting: SortingType,
  channels: ChannelWithMyChannel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  locale: string
) {
  switch (sorting) {
    case 'alpha':
      return sortAlphabetically(channels, locale);
    
    case 'recent':
      return sortByRecent(channels);
    
    case 'manual':
      return sortManually(channels);
    
    case 'combined':
    default:
      return sortCombined(channels, notifyProps);
  }
}

// Alphabetical
function sortAlphabetically(channels, locale) {
  return [...channels].sort((a, b) => {
    const nameA = a.channel.displayName || a.channel.name;
    const nameB = b.channel.displayName || b.channel.name;
    return nameA.localeCompare(nameB, locale);
  });
}

// Recent
function sortByRecent(channels) {
  return [...channels].sort((a, b) => {
    return b.myChannel.lastPostAt - a.myChannel.lastPostAt;
  });
}

// Manual
function sortManually(channels) {
  return [...channels].sort((a, b) => {
    return a.sortOrder - b.sortOrder;
  });
}
```

---

## Category Management

### Category Structure

```typescript
interface CategoryModel {
  id: string;
  displayName: string;
  type: 'favorites' | 'channels' | 'direct_messages' | 'custom';
  teamId: string;
  sortOrder: number;
  sorting: SortingType;
  collapsed: boolean;
  muted: boolean;
  
  // Relations
  myChannels: Query<MyChannelModel>;
  channels: Query<ChannelModel>;
  categoryChannelsBySortOrder: Query<CategoryChannelModel>;
}
```

### Category Collapse/Expand

```typescript
// In category_body.tsx
const animatedStyle = useAnimatedStyle(() => {
  const opacity = unreadHeight > 0 ? 1 : 0;
  const heightDuration = unreadHeight > 0 ? 200 : 300;
  
  return {
    height: withTiming(
      sharedValue.value ? unreadHeight : height,
      { duration: heightDuration }
    ),
    opacity: withTiming(
      sharedValue.value ? opacity : 1,
      { duration: sharedValue.value ? 200 : 300 }
    ),
  };
}, [height, unreadHeight]);

// When collapsed, show only unread channels
const dataToShow = category.collapsed ? unreadChannels : allChannels;
```

**Logic**: 
- Collapsed category shows only unread channels
- Smooth animation when toggling
- Opacity fades when only unreads visible

---

## Unreads-On-Top Feature

### How It Works

```typescript
// 1. Preference (User + Server)
const unreadsOnTopUserPreference = querySidebarPreferences(
  database,
  Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS
);

const unreadsOnTopServerPreference = observeConfigBooleanValue(
  database,
  'ExperimentalGroupUnreadChannels'
);

// User preference overrides server
const unreadsOnTop = unreadsOnTopServerPreference.pipe(
  combineLatestWith(unreadsOnTopUserPreference),
  switchMap(([server, user]) => {
    if (!user) return of$(server);
    return of$(user !== 'false');
  })
);

// 2. Category Rendering
if (unreadsOnTop) {
  categoriesToShow = ['UNREADS', ...orderedCategories];
} else {
  categoriesToShow = orderedCategories;
}

// 3. In Category Body
if (unreadsOnTop) {
  // Filter out unreads from category (shown in UNREADS section)
  const channelsToShow = sortedChannels.filter(c => !unreadIds.has(c.id));
} else {
  // Show all channels
  const channelsToShow = sortedChannels;
}
```

**Flow**:
1. If enabled, show "UNREADS" pseudo-category at top
2. Collect ALL unread channels across categories
3. Remove unreads from individual categories (no duplicates)

---

## UI Components Breakdown

### 1. **ChannelListScreen** (Main Container)

```typescript
<ChannelListScreen>
  <AnnouncementBanner />           {/* If licensed */}
  <Servers />                      {/* Server switcher icon */}
  <TeamSidebar />                  {/* Team icons */}
  <CategoriesList>
    <ChannelListHeader>            {/* Team name + plus */}
      <TeamName />
      <ServerName />
      <PlusButton />
    </ChannelListHeader>
    
    <SubHeader>                    {/* Search + filter */}
      <UnreadFilter />
      <SearchField />
    </SubHeader>
    
    <ThreadsButton />              {/* If CRT enabled */}
    <DraftsButton />               {/* If has drafts */}
    
    <Categories>                   {/* Main list */}
      <UnreadCategories />         {/* If unreadsOnTop */}
      
      <FlatList>
        {categories.map(category => (
          <>
            <CategoryHeader />     {/* Collapsible */}
            <CategoryBody>         {/* Channels */}
              <FlatList>
                {channels.map(channel => (
                  <ChannelItem />
                ))}
              </FlatList>
            </CategoryBody>
          </>
        ))}
      </FlatList>
    </Categories>
  </CategoriesList>
  
  <AdditionalTabletView />         {/* Tablet only */}
  <FloatingCallContainer />        {/* If calls */}
</ChannelListScreen>
```

---

### 2. **ChannelItem** (Individual Channel)

Located in: `/app/components/channel_item/`

**Props**:
- `channel: ChannelModel`
- `onPress: (channel) => void`
- `shouldHighlightActive: boolean` - Highlight if active
- `shouldHighlightState: boolean` - Show selected state
- `isOnHome: boolean` - Different styling

**Displays**:
- Channel icon (based on type)
- Channel name
- Unread badge (if unread)
- Mention badge (if mentions)
- Muted indicator (if muted)

---

### 3. **Search & Filter**

#### Search Field
```typescript
// Fake input, opens search screen
<TouchableHighlight onPress={() => findChannels()}>
  <CompassIcon name='magnify' />
  <Text>Find channels...</Text>
</TouchableHighlight>
```

#### Unread Filter
```typescript
// Toggle button
<TouchableOpacity onPress={() => {
  showUnreadChannelsOnly(serverUrl, !onlyUnreads);
}}>
  <View style={onlyUnreads && styles.filtered}>
    <CompassIcon name='filter-variant' />
  </View>
</TouchableOpacity>
```

---

## Key Functions & Utilities

### Location: `/app/utils/categories.ts`

#### 1. **filterArchivedChannels**
```typescript
export function filterArchivedChannels(
  channels: ChannelWithMyChannel[],
  currentChannelId: string
): ChannelWithMyChannel[]
```
Removes archived channels unless current.

#### 2. **filterManuallyClosedDms**
```typescript
export function filterManuallyClosedDms(
  channels: ChannelWithMyChannel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  closedPrefs: PreferenceModel[],
  currentUserId: string,
  lastUnreadId?: string
): ChannelWithMyChannel[]
```
Filters user-closed DMs.

#### 3. **filterAutoclosedDMs**
```typescript
export function filterAutoclosedDMs(
  categoryType: string,
  limit: number,
  currentUserId: string,
  currentChannelId: string,
  channels: ChannelWithMyChannel[],
  autoclosePrefs: PreferenceModel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  deactivatedUsers?: UserModel[],
  lastUnreadId?: string
): ChannelWithMyChannel[]
```
Auto-hides inactive DMs based on time/limit.

#### 4. **sortChannels**
```typescript
export function sortChannels(
  sorting: CategorySorting,
  channels: ChannelWithMyChannel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  locale: string
): ChannelModel[]
```
Sorts channels by preference.

#### 5. **getUnreadIds**
```typescript
export function getUnreadIds(
  channels: ChannelWithMyChannel[],
  notifyProps: Record<string, ChannelNotifyProps>,
  lastUnreadId?: string
): Set<string>
```
Returns set of channel IDs with unreads.

#### 6. **isDMorGM**
```typescript
export function isDMorGM(channel: Channel | ChannelModel): boolean {
  return channel.type === 'D' || channel.type === 'G';
}
```

---

## Performance Optimizations

### 1. **FlatList Optimizations**
```typescript
<FlatList
  data={channels}
  keyExtractor={item => item.id}
  initialNumToRender={20}
  removeClippedSubviews={true}
  strictMode={true}
/>
```

### 2. **Observable Efficiency**
- `distinctUntilChanged()` - Only emit on actual changes
- `observeWithColumns([...])` - Watch specific columns only
- Unsubscribe on unmount

### 3. **Memoization**
```typescript
const categoriesToShow = useMemo(() => {
  // Heavy computation
}, [categories, unreadsOnTop, onlyUnreads]);
```

### 4. **Lazy Loading**
```typescript
// Fetch DM info only when needed
useEffect(() => {
  if (directChannels.length) {
    fetchDirectChannelsInfo(serverUrl, directChannels);
  }
}, [directChannels.length]);
```

---

## Common User Flows

### Flow 1: Opening App → Viewing Channels

1. App opens → `ChannelListScreen` mounts
2. `index.ts` observables fetch data from DB
3. `CategoriesList` receives:
   - `hasChannels`, `isCRTEnabled`, etc.
4. `Categories` component queries categories for team
5. For each category:
   - `CategoryHeader` renders
   - `CategoryBody` observable chain runs:
     - Fetch myChannels + channels
     - Apply filters (archived, closed, autoclosed)
     - Sort channels
     - Calculate unreads
   - `FlatList` renders `ChannelItem`s
6. User sees organized channel list

---

### Flow 2: Toggling Unreads-Only Filter

1. User taps filter icon
2. `showUnreadChannelsOnly(serverUrl, true)` called
3. Updates `onlyUnreads` in database
4. Observable emits change
5. `Categories` component re-renders:
   - Shows only `UnreadCategories`
   - Hides normal category list
6. `UnreadCategories` displays all unread channels

---

### Flow 3: Collapsing Category

1. User taps category header
2. `toggleCollapseCategory(serverUrl, categoryId)` called
3. Updates `collapsed: true` in database
4. Observable emits change
5. `CategoryBody` re-renders:
   - Animates height reduction
   - Shows only unread channels
   - Opacity transition

---

### Flow 4: New Message in DM

1. WebSocket receives new message event
2. Updates `MyChannel.lastPostAt` and `isUnread`
3. Observable emits change
4. Category Body re-filters/re-sorts
5. DM appears in list (even if was auto-closed)
6. Unread badge updates
7. If `unreadsOnTop`, appears in UNREADS section

---

## Summary

The Channel List architecture is built on:

✅ **Reactive Data**: WatermelonDB + RxJS observables  
✅ **Smart Filtering**: 4-layer filter system (archived, manual, auto, unreads)  
✅ **Flexible Sorting**: Recent, alphabetical, manual  
✅ **Category System**: Organize channels logically  
✅ **DM Management**: Auto-close, deactivated users, limits  
✅ **Performance**: Optimized FlatLists, memoization, lazy loading  
✅ **Unreads-On-Top**: Collects unreads across categories  
✅ **Animations**: Smooth collapse/expand, screen transitions  

This system handles **hundreds of channels** efficiently while providing real-time updates and a smooth user experience! 🚀

---

## For Daakia Implementation

When building your Daakia home page, you can:

1. **Reuse the Observable Pattern**: `withObservables` HOCs
2. **Adopt Filtering Logic**: Use the same filter utilities
3. **Implement Categories**: Similar category structure
4. **Handle DMs**: Use DM filtering for "Chats" tab
5. **Add Sorting**: Implement sorting options
6. **Optimize Performance**: FlatList best practices

The key is understanding the **Observable → Filter → Sort → Render** pipeline! 💡

