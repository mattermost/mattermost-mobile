# DaakiaHome vs Original ChannelList Feature Comparison

## 📊 Summary

This document compares the features and functionality between the **original ChannelList** (default Home screen) and **DaakiaHome** (custom implementation).

---

## ✅ Features Present in Original ChannelList BUT Missing in DaakiaHome

### 1. **UI Components**

#### **AnnouncementBanner** ❌ Missing
- **What it does**: Shows important announcements/banners from the server
- **Impact**: Users won't see important announcements
- **Location**: `app/components/announcement_banner`
- **Usage**: `<AnnouncementBanner/>` (shown when `isLicensed` is true)

#### **TeamSidebar** ❌ Missing
- **What it does**: Shows sidebar with team switcher and team list
- **Impact**: Users can't easily switch between teams
- **Location**: `app/components/team_sidebar`
- **Usage**: `<TeamSidebar iconPad={canAddOtherServers} hasMoreThanOneTeam={props.hasMoreThanOneTeam} />`

#### **Servers Component** ❌ Missing
- **What it does**: Shows server switcher (for multi-server setups)
- **Impact**: Users can't switch between different Mattermost servers
- **Location**: `app/screens/home/channel_list/servers`
- **Usage**: `<Servers/>` (shown when `canAddOtherServers` is true)

#### **AdditionalTabletView** ❌ Missing
- **What it does**: Additional UI for tablet layouts (split view)
- **Impact**: Tablet users don't get optimized tablet experience
- **Location**: `app/screens/home/channel_list/additional_tablet_view`
- **Usage**: `<AdditionalTabletView/>` (shown when `isTablet && hasChannels`)

#### **CategoriesList** ❌ Missing (Different Implementation)
- **What it does**: Shows channels organized by categories (favorites, channels, DMs, etc.)
- **Original**: Uses sidebar-style categories with expand/collapse
- **DaakiaHome**: Uses flat tabs (All, DMs, Channels, Favorites)
- **Impact**: Different UX - DaakiaHome is more modern but loses category organization

---

### 2. **Functionality & Lifecycle**

#### **Terms of Service (ToS) Handling** ❌ Missing
- **What it does**: Automatically shows Terms of Service modal if user hasn't accepted
- **Code**: `useEffect(() => { if (props.showToS && !NavigationStore.isToSOpen()) { openToS(); } }, [props.showToS]);`
- **Impact**: Users might not see required ToS acceptance
- **Props needed**: `showToS: boolean` (from `observeShowToS(database)`)

#### **Current User Refetch** ❌ Missing
- **What it does**: Refetches current user data if missing or invalid
- **Code**: `useEffect(() => { if (!props.hasCurrentUser || !props.currentUserId) { refetchCurrentUser(serverUrl, props.currentUserId); } }, [...]);`
- **Impact**: User data might be stale or missing
- **Props needed**: `hasCurrentUser: boolean`, `currentUserId: string`

#### **App Review Prompt** ❌ Missing
- **What it does**: Prompts users to rate the app (controlled by first render flag)
- **Code**: `tryRunAppReview(props.launchType, props.coldStart)`
- **Impact**: Missing app store ratings/reviews
- **Props needed**: `launchType: LaunchType`, `coldStart?: boolean`

#### **Performance Metrics** ❌ Missing
- **What it does**: Tracks performance metrics for analytics
- **Code**: 
  ```typescript
  PerformanceMetricsManager.finishLoad('HOME', serverUrl);
  PerformanceMetricsManager.measureTimeToInteraction();
  ```
- **Impact**: Missing performance tracking for analytics/optimization

#### **Sentry Context** ❌ Missing
- **What it does**: Adds server context to Sentry error tracking
- **Code**: `addSentryContext(serverUrl)`
- **Impact**: Errors might not have proper context for debugging

---

### 3. **Android-Specific Features**

#### **Hardware Back Button Handler** ❌ Missing
- **What it does**: Handles Android back button with "Press back again to exit" prompt
- **Code**: `BackHandler.addEventListener('hardwareBackPress', handleBackPress)`
- **Impact**: Android users can't use back button to exit app properly
- **Features**:
  - Double-tap to exit with toast message
  - Navigation to home tab when on other tabs

#### **Screen Transition Animations** ⚠️ Different
- **Original**: Uses `useAnimatedStyle` with slide/fade animations based on `route.params.direction`
- **DaakiaHome**: Has animations but different implementation (uses `useSharedValue` and `withTiming`)

---

### 4. **Observable Props Missing**

#### **isLicensed** ❌ Missing
- **What it does**: Indicates if server has a license
- **Usage**: Controls whether to show `AnnouncementBanner`
- **Source**: `observeLicense(database)`

#### **isCRTEnabled** ❌ Missing
- **What it does**: Indicates if Collapsed Reply Threads (CRT) is enabled
- **Usage**: Passed to `CategoriesList` component
- **Source**: `observeIsCRTEnabled(database)`

#### **hasMoreThanOneTeam** ❌ Missing
- **What it does**: Indicates if user belongs to multiple teams
- **Usage**: Controls `TeamSidebar` icon padding
- **Source**: `teamsCount.pipe(switchMap((v) => of$(v > 1)))`

#### **hasChannels** ❌ Missing
- **What it does**: Indicates if current team has channels
- **Usage**: Controls visibility of `AdditionalTabletView`
- **Source**: `queryAllMyChannelsForTeam(database, id).observeCount(false)`

#### **showToS** ❌ Missing
- **What it does**: Indicates if Terms of Service should be shown
- **Usage**: Triggers ToS modal
- **Source**: `observeShowToS(database)`

#### **launchType** ❌ Missing
- **What it does**: Indicates how the app was launched (Normal, DeepLink, Notification, etc.)
- **Usage**: Used for app review timing
- **Source**: From `LaunchProps`

#### **coldStart** ❌ Missing
- **What it does**: Indicates if this is a cold start (app wasn't running)
- **Usage**: Used for app review timing
- **Source**: From `LaunchProps`

---

### 5. **Managed Config Support** ❌ Missing

#### **EMM (Enterprise Mobility Management) Config** ❌ Missing
- **What it does**: Checks managed config for enterprise policies (e.g., `allowOtherServers`)
- **Code**: `const managedConfig = useManagedConfig<ManagedConfig>();`
- **Impact**: Enterprise features might not work correctly

---

## ✅ Features Present in DaakiaHome BUT NOT in Original

### 1. **Custom UI Components**

#### **DaakiaHeader** ✅ Unique
- **What it does**: Custom header with search, filters, and actions
- **Original**: Uses `ChannelListHeader` component

#### **DaakiaTabs** ✅ Unique
- **What it does**: Tab-based navigation (All, DMs, Channels, Favorites)
- **Original**: Uses category-based sidebar navigation

#### **DaakiaChannelList** ✅ Unique
- **What it does**: Custom channel list rendering with modern UI
- **Original**: Uses `CategoriesList` with sidebar-style organization

### 2. **Custom Functionality**

#### **Tab-Based Filtering** ✅ Unique
- **What it does**: Filters channels by tabs (All, DMs, Channels, Favorites)
- **Original**: Uses category-based organization

#### **Active Filters (Unread, Threads, Drafts)** ✅ Unique
- **What it does**: Additional filter buttons for quick filtering
- **Original**: Uses separate screens/buttons for threads and drafts

#### **Auto-Fetch Posts on Empty Database** ✅ Unique
- **What it does**: Automatically fetches posts for all channels if database is empty
- **Code**: Lines 195-228 in `home_daakia/index.tsx`
- **Original**: Relies on normal data loading flow

#### **Database Empty Detection** ✅ Unique
- **What it does**: Detects when database has no posts and triggers bulk fetch
- **Original**: Doesn't have this auto-fetch mechanism

---

## 🔄 Features Present in BOTH (But Implemented Differently)

### 1. **Team Validation**
- **Original**: Checks `hasTeams` prop and redirects
- **DaakiaHome**: Checks `nTeams` prop and redirects
- **Status**: ✅ Both work correctly (we fixed this)

### 2. **Incoming Calls**
- **Original**: Shows `FloatingCallContainer` when `showIncomingCalls && !isTablet`
- **DaakiaHome**: Shows `FloatingCallContainer` in wrapper view
- **Status**: ✅ Both implemented

### 3. **Channel List Display**
- **Original**: Category-based with sidebar
- **DaakiaHome**: Flat list with tabs
- **Status**: ✅ Both work, different UX approaches

---

## 📋 Recommended Additions to DaakiaHome

### **High Priority** 🔴

1. **TeamSidebar** - Essential for multi-team users
2. **AnnouncementBanner** - Important for server announcements
3. **Hardware Back Button Handler** - Critical for Android UX
4. **Terms of Service Handling** - Legal/compliance requirement
5. **Current User Refetch** - Data integrity

### **Medium Priority** 🟡

6. **Performance Metrics** - Analytics/optimization
7. **Sentry Context** - Error tracking
8. **Managed Config Support** - Enterprise features
9. **AdditionalTabletView** - Tablet optimization
10. **isCRTEnabled Support** - Feature flags

### **Low Priority** 🟢

11. **App Review Prompt** - Nice to have
12. **Servers Component** - Only if multi-server is needed

---

## 💡 Implementation Notes

### To Add Missing Features:

1. **Import missing components**:
   ```typescript
   import AnnouncementBanner from '@components/announcement_banner';
   import TeamSidebar from '@components/team_sidebar';
   import Servers from '@screens/home/channel_list/servers';
   ```

2. **Add missing observables**:
   ```typescript
   isLicensed: observeLicense(database),
   isCRTEnabled: observeIsCRTEnabled(database),
   hasMoreThanOneTeam: teamsCount.pipe(switchMap((v) => of$(v > 1))),
   hasChannels: observeCurrentTeamId(database).pipe(...),
   showToS: observeShowToS(database),
   ```

3. **Add missing lifecycle hooks**:
   ```typescript
   // ToS handling
   useEffect(() => { ... }, [showToS]);
   
   // User refetch
   useEffect(() => { ... }, [hasCurrentUser, currentUserId]);
   
   // Back handler (Android)
   useEffect(() => { ... }, [handleBackPress]);
   
   // Performance metrics
   useEffect(() => { ... }, []);
   ```

4. **Add LaunchProps**:
   - Need to pass `launchType` and `coldStart` from parent component

---

## 🎯 Conclusion

**DaakiaHome is a modern, simplified implementation** with:
- ✅ Better UX with tabs instead of categories
- ✅ Auto-fetch when database is empty
- ✅ Modern UI components

**But it's missing several important features**:
- ❌ Team switching (TeamSidebar)
- ❌ Server switching (Servers)
- ❌ Android back button handling
- ❌ Announcements
- ❌ Several lifecycle hooks and observables

**Recommendation**: Add the High Priority items to make DaakiaHome production-ready while keeping its modern UX.

