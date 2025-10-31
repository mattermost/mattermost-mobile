# DaakiaHome Team Validation - Implementation Guide

## 🎯 Quick Summary

Your custom DaakiaHome is breaking the "no teams → Join Team screen" flow because:

1. **`daakiaLogout` doesn't clear the database** - Old user's teams/channels persist
2. **DaakiaHome has no team validation** - It renders regardless of team state
3. **Potential race condition** - `appEntry()` is called before team check completes

---

## 🔧 Implementation Steps

### Step 1: Fix `daakiaLogout` to Clear Database ⭐ CRITICAL

**File:** `app/actions/remote/daakia_logout.ts`

**Current Code:**
```typescript
export const daakiaLogout = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.logout();
    } catch (error) {
        logWarning('An error occurred logging out from the server', serverUrl, getFullErrorMessage(error));
    }

    await removeServerCredentials(serverUrl);
    PushNotifications.removeServerNotifications(serverUrl);
    SecurityManager.removeServer(serverUrl);
    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);

    // ❌ MISSING: Database cleanup!

    relaunchApp({launchType: Launch.Normal});

    return {data: true};
};
```

**Fixed Code:**
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

    // ✅ ADD THIS: Clear the database to remove all user data
    await DatabaseManager.deleteServerDatabase(serverUrl);

    // Optional: Also clear caches and cookies (like terminateSession does)
    Image.clearDiskCache();
    deleteFileCache(serverUrl);
    deleteFileCacheByDir('mmPasteInput');
    deleteFileCacheByDir('thumbnails');
    if (Platform.OS === 'android') {
        deleteFileCacheByDir('image_cache');
    }

    // Restart app - will auto-connect to Daakia
    relaunchApp({launchType: Launch.Normal});

    return {data: true};
};
```

**Required Imports:**
```typescript
import {Image} from 'expo-image';
import {Platform} from 'react-native';
import DatabaseManager from '@database/manager';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
```

---

### Step 2: Add Team Validation to HomeDaakia ⭐ HIGH PRIORITY

**File:** `app/screens/home/home_daakia/index.tsx`

**Option A: Redirect to Select Team (Recommended)**

1. **Add `nTeams` prop to HomeDaakiaProps:**

```typescript
type HomeDaakiaProps = {
    threadsUnread?: ThreadsUnread;
    teamDisplayName?: string;
    canCreateChannels?: boolean;
    canJoinChannels?: boolean;
    canInvitePeople?: boolean;
    allChannels: ChannelModel[];
    unreadIds: Set<string>;
    lastPosts?: Map<string, PostModel>;
    currentUserId: string;
    favoriteChannelIds: Set<string>;
    draftsCount?: number;
    showIncomingCalls: boolean;
    nTeams: number;  // ✅ ADD THIS
};
```

2. **Update HomeDaakia component to check for teams:**

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
    nTeams,  // ✅ ADD THIS
}: HomeDaakiaProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const nav = useNavigation();
    const serverUrl = useServerUrl();
    
    // ✅ ADD THIS: Redirect if user has no teams
    useEffect(() => {
        if (isFocused && nTeams === 0) {
            // User has no teams, redirect to Select Team screen
            import('@screens/navigation').then(({resetToTeams}) => {
                resetToTeams();
            });
        }
    }, [isFocused, nTeams]);

    // ✅ ADD THIS: Show loading while checking team state
    if (nTeams === 0) {
        return (
            <SafeAreaView
                style={styles.container}
                edges={['bottom', 'left', 'right']}
            >
                <Loading
                    size='large'
                    themeColor='centerChannelColor'
                    testID='home_daakia.checking_teams'
                />
            </SafeAreaView>
        );
    }

    // ... rest of component (existing code) ...
};
```

3. **Update the observable enhancement to include nTeams:**

Find this section (around line 437):

```typescript
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    // ... existing code ...
    
    const myTeams = queryMyTeams(database).observe();
    
    // ✅ ADD THIS: Observable for team count
    const nTeams = myTeams.pipe(
        switchMap((teams) => of$(teams.length)),
        distinctUntilChanged(),
    );

    return {
        // ... existing returns ...
        nTeams,  // ✅ ADD THIS
    };
});
```

**Option B: Show Empty State in HomeDaakia (Alternative)**

If you prefer to keep users in HomeDaakia and show a "Join Teams" prompt:

```typescript
const HomeDaakia = ({
    // ... props ...
    nTeams,
}: HomeDaakiaProps) => {
    // ... existing hooks ...

    // ✅ ADD THIS: Render empty state for no teams
    if (nTeams === 0) {
        return (
            <SafeAreaView
                style={styles.container}
                edges={['bottom', 'left', 'right']}
            >
                <View style={styles.emptyStateContainer}>
                    <CompassIcon
                        name='account-multiple-outline'
                        size={120}
                        color={theme.centerChannelColor}
                        style={styles.emptyStateIcon}
                    />
                    <Text style={styles.emptyStateTitle}>
                        {intl.formatMessage({
                            id: 'home_daakia.no_teams.title',
                            defaultMessage: 'Join a Team',
                        })}
                    </Text>
                    <Text style={styles.emptyStateDescription}>
                        {intl.formatMessage({
                            id: 'home_daakia.no_teams.description',
                            defaultMessage: 'You\'re not a member of any teams yet. Join a team to start collaborating.',
                        })}
                    </Text>
                    <TouchableOpacity
                        style={styles.joinTeamButton}
                        onPress={() => {
                            import('@screens/navigation').then(({resetToTeams}) => {
                                resetToTeams();
                            });
                        }}
                    >
                        <Text style={styles.joinTeamButtonText}>
                            {intl.formatMessage({
                                id: 'home_daakia.no_teams.button',
                                defaultMessage: 'Browse Teams',
                            })}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ... rest of component ...
};
```

And add the styles:

```typescript
const getStyles = (theme: Theme) => ({
    // ... existing styles ...
    
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateIcon: {
        marginBottom: 20,
        opacity: 0.5,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: theme.centerChannelColor,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 16,
        color: theme.centerChannelColor,
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 30,
    },
    joinTeamButton: {
        backgroundColor: theme.buttonBg,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
    },
    joinTeamButtonText: {
        color: theme.buttonColor,
        fontSize: 16,
        fontWeight: '600',
    },
});
```

---

### Step 3: Verify Database Initialization on Login (Medium Priority)

**File:** `app/actions/remote/session.ts` (login function)

The current code at line 134-141:

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

**Check:** Does `createServerDatabase` properly handle existing databases?

**File to verify:** `app/database/manager/index.ts`

Look for the `createServerDatabase` method and ensure:
- If a database already exists for this serverUrl, it should either:
  - Be deleted and recreated fresh, OR
  - Be properly reset/cleared before use

**Recommended enhancement:** Before creating database, explicitly check and clear:

```typescript
// In app/actions/remote/session.ts, BEFORE createServerDatabase:

// Check if database already exists from previous session
if (DatabaseManager.serverDatabases[serverUrl]) {
    // Clear existing database to ensure fresh start
    await DatabaseManager.deleteServerDatabase(serverUrl);
}

const server = await DatabaseManager.createServerDatabase({
    config: {
        dbName: serverUrl,
        serverUrl,
        identifier: config.DiagnosticId,
        displayName: serverDisplayName,
    },
});
```

---

### Step 4: Fix Race Condition in launchToHome (Low Priority)

**File:** `app/init/launch.ts`

**Issue:** `appEntry()` is called BEFORE the team check, which opens WebSockets and might trigger data sync before navigation is decided.

**Current Code (lines 175-226):**

```typescript
export const launchToHome = async (props: LaunchProps) => {
    let openPushNotification = false;

    switch (props.launchType) {
        case Launch.DeepLink: {
            appEntry(props.serverUrl!);  // ❌ Called before team check
            break;
        }
        case Launch.Notification: {
            // ...
            appEntry(props.serverUrl!);  // ❌ Called before team check
            break;
        }
        case Launch.Normal:
            // ...
            appEntry(props.serverUrl!);  // ❌ Called before team check
            break;
    }

    // Team check happens AFTER appEntry
    let nTeams = 0;
    if (props.serverUrl) {
        const database = DatabaseManager.serverDatabases[props.serverUrl]?.database;
        if (database) {
            nTeams = await queryMyTeams(database).fetchCount();
        }
    }

    if (nTeams) {
        return resetToHome(props);
    }

    return resetToTeams();
}
```

**Potential Fix:** Move team check BEFORE appEntry, so WebSocket isn't opened if user will be redirected anyway:

```typescript
export const launchToHome = async (props: LaunchProps) => {
    let openPushNotification = false;

    // ✅ CHECK TEAMS FIRST
    let nTeams = 0;
    if (props.serverUrl) {
        const database = DatabaseManager.serverDatabases[props.serverUrl]?.database;
        if (database) {
            nTeams = await queryMyTeams(database).fetchCount();
        }
    }

    // If no teams, immediately redirect (don't open WebSocket, etc.)
    if (nTeams === 0) {
        logInfo('Launch app in Select Teams screen');
        return resetToTeams();
    }

    // Only proceed with appEntry if user has teams
    switch (props.launchType) {
        case Launch.DeepLink: {
            appEntry(props.serverUrl!);
            break;
        }
        case Launch.Notification: {
            const extra = props.extra as NotificationWithData;
            openPushNotification = Boolean(props.serverUrl && !props.launchError && extra.userInteraction && extra.payload?.channel_id && !extra.payload?.userInfo?.local);
            if (openPushNotification) {
                await resetToHome(props);
                return pushNotificationEntry(props.serverUrl!, extra.payload!, 'Notification');
            }
            appEntry(props.serverUrl!);
            break;
        }
        case Launch.Normal:
            if (props.coldStart) {
                const lastViewedChannel = await getLastViewedChannelIdAndServer();
                const lastViewedThread = await getLastViewedThreadIdAndServer();

                if (lastViewedThread && lastViewedThread.server_url === props.serverUrl && lastViewedThread.thread_id) {
                    PerformanceMetricsManager.setLoadTarget('THREAD');
                    fetchAndSwitchToThread(props.serverUrl!, lastViewedThread.thread_id);
                } else if (lastViewedChannel && lastViewedChannel.server_url === props.serverUrl && lastViewedChannel.channel_id) {
                    PerformanceMetricsManager.setLoadTarget('CHANNEL');
                    switchToChannelById(props.serverUrl!, lastViewedChannel.channel_id);
                } else {
                    PerformanceMetricsManager.setLoadTarget('HOME');
                }

                appEntry(props.serverUrl!);
            }
            break;
    }

    logInfo('Launch app in Home screen');
    return resetToHome(props);
}
```

---

## 📋 Implementation Checklist

- [ ] **Step 1:** Fix `daakiaLogout` to call `DatabaseManager.deleteServerDatabase()`
- [ ] **Step 2:** Add `nTeams` observable to HomeDaakia enhancement
- [ ] **Step 2:** Add team validation check in HomeDaakia component
- [ ] **Step 2:** Add redirect or empty state when `nTeams === 0`
- [ ] **Step 3:** Verify `createServerDatabase` clears existing data
- [ ] **Step 4:** (Optional) Move team check before `appEntry` in `launchToHome`

---

## 🧪 Testing Steps

After implementing the fixes:

1. **Test 1: Fresh install, user with teams**
   - Fresh install app
   - Login with `act1` (has teams)
   - ✅ Should see DaakiaHome with act1's chats

2. **Test 2: Fresh install, user without teams**
   - Fresh install app
   - Login with `act2` (no teams)
   - ✅ Should see "Join Team" (SELECT_TEAM) screen
   - ✅ Should NOT see DaakiaHome

3. **Test 3: Switch from user with teams to user without teams**
   - Login with `act1` (has teams)
   - Verify you see DaakiaHome with act1's data
   - Logout
   - Login with `act2` (no teams)
   - ✅ Should see "Join Team" screen
   - ✅ Should NOT see any of act1's old data

4. **Test 4: Switch from user with teams to different user with teams**
   - Login with `act1` (has teams)
   - Note act1's channels/chats
   - Logout
   - Login with `act3` (different teams)
   - ✅ Should see act3's channels/chats
   - ✅ Should NOT see any of act1's data

5. **Test 5: User joins team**
   - Login with `act2` (no teams)
   - See "Join Team" screen
   - Join a team
   - ✅ Should automatically redirect to DaakiaHome
   - ✅ Should see the new team's channels

6. **Test 6: User removed from all teams**
   - Login with user that has teams
   - Admin removes user from all teams (server-side)
   - WebSocket receives team leave event
   - ✅ Should redirect to "Join Team" screen

---

## 🔍 Debugging Tips

If issues persist after implementation:

1. **Add logging to track team count:**
   ```typescript
   useEffect(() => {
       console.log('HomeDaakia: nTeams =', nTeams);
       console.log('HomeDaakia: allChannels =', allChannels.length);
   }, [nTeams, allChannels]);
   ```

2. **Check database state after logout:**
   ```typescript
   // In daakiaLogout, after deleteServerDatabase:
   console.log('After logout, serverDatabases:', Object.keys(DatabaseManager.serverDatabases));
   ```

3. **Verify team query:**
   ```typescript
   // In launchToHome:
   const teams = await queryMyTeams(database).fetch();
   console.log('launchToHome: teams =', teams.map(t => ({id: t.id, name: t.displayName})));
   console.log('launchToHome: nTeams =', nTeams);
   ```

4. **Check navigation state:**
   ```typescript
   // Add to HomeDaakia:
   useEffect(() => {
       const navState = nav.getState();
       console.log('HomeDaakia navigation state:', JSON.stringify(navState, null, 2));
   }, []);
   ```

---

## 📞 Common Issues & Solutions

### Issue: "I fixed logout but still see old data"
**Solution:** The database might be created before deletion completes. Ensure `deleteServerDatabase` finishes before `relaunchApp`:

```typescript
await DatabaseManager.deleteServerDatabase(serverUrl);
await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
relaunchApp({launchType: Launch.Normal});
```

### Issue: "HomeDaakia still loads before team check"
**Solution:** The Tab Navigator might be initializing all tabs eagerly. Set `lazy: true` (already done) and ensure the team check happens synchronously.

### Issue: "SELECT_TEAM shows but immediately redirects to Home"
**Solution:** Check `app/screens/select_team/select_team.tsx` lines 110-121. This has an effect that auto-redirects if `nTeams > 0`. The database might not be cleared properly.

---

**Last Updated:** 2025-10-30  
**Status:** Ready for implementation  
**Estimated Time:** 2-4 hours

