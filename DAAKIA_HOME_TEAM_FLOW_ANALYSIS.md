# DaakiaHome Team Validation Flow Analysis

## 🔍 Summary of the Issue

You have correctly identified that users with no teams should be redirected to the "Join Team" screen, but instead they're seeing DaakiaHome. Additionally, when switching accounts, old session data persists. This analysis explains **why** this is happening and **what** needs to be fixed.

---

## ✅ How the Original Home Page Flow Works

### 1. **Entry Point: `app/init/launch.ts`**

The key logic that determines routing is in the `launchToHome` function (lines 172-226):

```typescript
export const launchToHome = async (props: LaunchProps) => {
    // ... handle notifications, deep links, etc ...

    // ⭐ KEY TEAM VALIDATION LOGIC
    let nTeams = 0;
    if (props.serverUrl) {
        const database = DatabaseManager.serverDatabases[props.serverUrl]?.database;
        if (database) {
            nTeams = await queryMyTeams(database).fetchCount();  // Count user's teams
        }
    }

    if (nTeams) {
        logInfo('Launch app in Home screen');
        return resetToHome(props);  // ✅ Has teams -> go to Home
    }

    logInfo('Launch app in Select Teams screen');
    return resetToTeams();  // ✅ No teams -> go to "Join Team" screen
}
```

**This logic works correctly!** The app properly detects when a user has no teams and calls `resetToTeams()`.

---

### 2. **What `resetToTeams()` Does** (`app/screens/navigation.ts` lines 430-467)

```typescript
export function resetToTeams() {
    return Navigation.setRoot({
        root: {
            stack: {
                children: [{
                    component: {
                        id: Screens.SELECT_TEAM,
                        name: Screens.SELECT_TEAM,
                        // ... navigation options ...
                    },
                }],
            },
        },
    });
}
```

This sets the root navigation to the **SELECT_TEAM** screen, which:
- Shows available teams the user can join (`app/screens/select_team/select_team.tsx`)
- If no teams are available, shows a "NoTeams" component (line 140)
- Automatically observes `queryMyTeams(database)` via RxJS observables
- If the user joins a team, it detects `nTeams > 0` and automatically redirects to Home (lines 115-120)

---

### 3. **What `resetToHome()` Does** (`app/screens/navigation.ts` lines 287-336)

```typescript
export function resetToHome(passProps: LaunchProps = {launchType: Launch.Normal}) {
    return Navigation.setRoot({
        root: {
            stack: {
                children: [{
                    component: {
                        id: Screens.HOME,
                        name: Screens.HOME,
                        // ... navigation options ...
                    },
                }],
            },
        },
    });
}
```

This loads the **HOME** screen (`app/screens/home/index.tsx`), which contains a Tab Navigator with:
- `HOME_DAAKIA` tab (your custom DaakiaHome) - **Currently the first/default tab**
- `SEARCH` tab
- `MENTIONS` tab
- `SAVED_MESSAGES` tab
- `ACCOUNT` tab

---

## ❌ Why DaakiaHome is Breaking This Flow

### Problem 1: **The Routing Logic is Actually Working, But DaakiaHome Loads Anyway**

Here's what's happening:

1. ✅ User logs in with account that has **no teams** (e.g., `act2`)
2. ✅ `launchToHome()` correctly detects `nTeams === 0`
3. ✅ App calls `resetToTeams()` to show "Join Team" screen
4. ❌ **BUT** something is causing the app to load DaakiaHome instead

**Root Cause:** You need to investigate if:
- There's a navigation override somewhere that's forcing HOME to load
- The `resetToTeams()` call is being ignored or overridden
- There's a race condition where navigation is set before the team check completes

### Problem 2: **DaakiaHome Has No Team-State Awareness**

Looking at `app/screens/home/home_daakia/index.tsx`:

```typescript
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    // ... lots of observable logic ...
    
    const myTeams = queryMyTeams(database).observe();
    const currentTeam = observeCurrentTeam(database);
    const currentTeamId = observeCurrentTeamId(database);
    
    // ... but NO check for whether user has teams or not ...
    // It just tries to render channels and content regardless!
});
```

**The issue:** DaakiaHome doesn't have any conditional rendering based on whether `nTeams === 0`. It assumes teams exist and tries to load channels, which causes:
- Showing stale data (if database wasn't cleared)
- Empty content (if database was cleared)
- No automatic redirect to "Join Team"

---

## 🔴 The Session Mix-Up / Stale Data Issue

### How Logout SHOULD Work

The standard logout flow in `app/managers/session_manager.ts` (lines 117-145):

```typescript
private terminateSession = async (serverUrl: string, removeServer: boolean) => {
    cancelSessionNotification(serverUrl);
    await removeServerCredentials(serverUrl);
    PushNotifications.removeServerNotifications(serverUrl);
    SecurityManager.removeServer(serverUrl);
    
    NetworkConnectivityManager.setServerConnectionStatus(false, serverUrl);
    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);
    
    // ⭐ CRITICAL: Database cleanup!
    if (removeServer) {
        await DatabaseManager.destroyServerDatabase(serverUrl);  // Completely remove DB
    } else {
        await DatabaseManager.deleteServerDatabase(serverUrl);   // Clear DB data
    }
    
    // Clear caches
    this.resetLocale();
    this.clearCookiesForServer(serverUrl);
    Image.clearDiskCache();
    deleteFileCache(serverUrl);
    // ... more cleanup ...
}
```

### How `daakiaLogout` Actually Works

In `app/actions/remote/daakia_logout.ts`:

```typescript
export const daakiaLogout = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.logout();
    } catch (error) {
        logWarning('error', error);
    }

    // Clear credentials and managers
    await removeServerCredentials(serverUrl);
    PushNotifications.removeServerNotifications(serverUrl);
    SecurityManager.removeServer(serverUrl);
    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);

    // ❌ MISSING: DatabaseManager.deleteServerDatabase() or destroyServerDatabase()
    // This means the database with all teams, channels, posts, etc. is NOT cleared!

    // Restart app
    relaunchApp({launchType: Launch.Normal});

    return {data: true};
};
```

**Root Cause of Session Mix-Up:**
- When you call `daakiaLogout`, the **database is NOT cleared**
- This means:
  - Team membership records (`MY_TEAM` table) persist
  - Channel records persist
  - Post records persist
  - User preferences persist
- When the next user logs in (`act2`):
  - The login creates/updates the current user
  - But the **database still contains act1's teams, channels, and posts**
  - `queryMyTeams(database).fetchCount()` returns `act1's team count` instead of 0
  - App thinks act2 has teams and loads Home instead of "Join Team"
  - DaakiaHome loads and shows act1's old chats!

---

## 🎯 What Needs to Be Fixed

### Fix 1: **Database Must Be Cleared on Logout**

Update `app/actions/remote/daakia_logout.ts`:

```typescript
export const daakiaLogout = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.logout();
    } catch (error) {
        logWarning('An error occurred logging out from the server', serverUrl, getFullErrorMessage(error));
    }

    // Clear ALL local data
    await removeServerCredentials(serverUrl);
    PushNotifications.removeServerNotifications(serverUrl);
    SecurityManager.removeServer(serverUrl);
    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);
    
    // ✅ ADD THIS: Clear the database!
    await DatabaseManager.deleteServerDatabase(serverUrl);  // or destroyServerDatabase if you want complete removal

    // Restart app - will auto-connect to Daakia
    relaunchApp({launchType: Launch.Normal});

    return {data: true};
};
```

### Fix 2: **Add Team-State Awareness to DaakiaHome**

Option A: **Redirect to Select Team if No Teams** (Recommended)

In `app/screens/home/home_daakia/index.tsx`, add a check:

```typescript
const HomeDaakia = ({
    threadsUnread,
    teamDisplayName,
    canCreateChannels,
    canJoinChannels,
    canInvitePeople,
    allChannels,
    unreadIds,
    lastPosts,
    currentUserId,
    favoriteChannelIds,
    draftsCount,
    showIncomingCalls,
    // ✅ Add this prop
    hasTeams,
}: HomeDaakiaProps) => {
    // ... existing hooks ...
    
    // ✅ Add this check
    useEffect(() => {
        if (!hasTeams) {
            // User has no teams, redirect to Select Team screen
            resetToTeams();
        }
    }, [hasTeams]);
    
    // ✅ Show loading while checking
    if (!hasTeams) {
        return <Loading />;
    }
    
    // ... rest of component ...
};
```

And update the observable enhancement to include team count:

```typescript
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const myTeams = queryMyTeams(database).observe();
    
    return {
        // ... existing observables ...
        hasTeams: myTeams.pipe(
            map(teams => teams.length > 0),
            distinctUntilChanged()
        ),
    };
});
```

Option B: **Show Empty State in DaakiaHome**

If you prefer to keep users in DaakiaHome but show a prompt to join teams, you can add conditional rendering for the empty state.

### Fix 3: **Ensure Database is Properly Initialized on Login**

In `app/actions/remote/session.ts`, the `login` function creates a server database:

```typescript
const server = await DatabaseManager.createServerDatabase({
    config: {
        dbName: serverUrl,
        serverUrl,
        identifier: config.DiagnosticId,
        displayName: serverDisplayName,
    },
});
```

Verify that `createServerDatabase` creates a **fresh, empty database** if one already exists. If the database file already exists from a previous user, it should be deleted first.

---

## 📋 Summary Table

| Issue | Current Behavior | Expected Behavior | Root Cause | Fix |
|-------|------------------|-------------------|------------|-----|
| Users with no teams see DaakiaHome instead of "Join Team" | DaakiaHome loads with empty/stale content | Should show SELECT_TEAM screen | Either navigation is overridden OR DaakiaHome doesn't check team state | Add team-state check to DaakiaHome and redirect if needed |
| Switching accounts shows old user's data | act2 sees act1's chats | act2 should see either "Join Team" or their own fresh data | `daakiaLogout` doesn't clear database | Add `DatabaseManager.deleteServerDatabase()` to logout |
| Manual cache clear still shows DaakiaHome instead of "Join Team" | DaakiaHome with empty content | Should show SELECT_TEAM screen | Home is set as root before team check OR DaakiaHome has no team validation | Add team count check to DaakiaHome component |

---

## 🔧 Implementation Priority

1. **HIGH PRIORITY**: Fix `daakiaLogout` to clear database (prevents session mix-up)
2. **HIGH PRIORITY**: Add team-state awareness to DaakiaHome (redirects users with no teams)
3. **MEDIUM PRIORITY**: Verify database initialization on login doesn't reuse stale data
4. **LOW PRIORITY**: Add better loading/empty states to DaakiaHome

---

## 🧪 Testing Checklist

After implementing fixes, test:

- [ ] Fresh install → Login with user that has teams → See DaakiaHome ✅
- [ ] Fresh install → Login with user that has NO teams → See "Join Team" screen ✅
- [ ] Login with user1 (has teams) → Logout → Login with user2 (no teams) → See "Join Team" screen ✅
- [ ] Login with user1 (has teams) → Logout → Login with user2 (has teams) → See user2's data, not user1's ✅
- [ ] User with no teams joins a team → Automatically redirected to Home ✅
- [ ] User gets removed from all teams → Redirected to "Join Team" screen ✅

---

## 📚 Key Files to Modify

1. `app/actions/remote/daakia_logout.ts` - Add database cleanup
2. `app/screens/home/home_daakia/index.tsx` - Add team-state check
3. Possibly `app/database/manager/index.ts` - Verify `createServerDatabase` behavior

---

**Generated:** 2025-10-30  
**Status:** Ready for implementation

