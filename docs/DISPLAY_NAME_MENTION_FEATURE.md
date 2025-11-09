# Display Name Mention Feature Documentation

## Overview

This document details the implementation of a feature that allows users to see **display names** (e.g., `@John Doe`) in the text field when selecting mentions from autocomplete, while ensuring the server receives **usernames** (e.g., `@john.doe`) for proper mention parsing and notifications.

**Feature Date:** December 2024  
**Status:** Implemented and Active

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Files Modified](#files-modified)
4. [Changes Made](#changes-made)
5. [How It Works](#how-it-works)
6. [Testing](#testing)
7. [Reverting Changes](#reverting-changes)
8. [Troubleshooting](#troubleshooting)

---

## Problem Statement

### User Experience Issue

When the **"Teammate Name Display"** setting is set to **"Show first and last name"**, users expect to see full names (e.g., `@John Doe`) in the text field when they select mentions from the autocomplete dropdown. However, the original implementation only showed usernames (e.g., `@john.doe`), which:

1. **Reduced readability** - Long or cryptic usernames are harder to read
2. **Inconsistent UX** - Display names are shown in posts and DMs, but not in the text field
3. **User confusion** - Users see full names everywhere except when typing mentions

### Technical Constraint

The Mattermost server requires **usernames** (not display names) for:
- Mention parsing and detection
- User lookup and notifications
- Mention highlighting in posts
- All server-side mention processing

### Solution Requirement

- **Frontend (UI)**: Show display names in the text field when users select from autocomplete
- **Backend (Server)**: Receive usernames for proper processing
- **Seamless conversion**: Automatically convert display names to usernames before submission

---

## Solution Overview

The solution implements a **two-part approach**:

1. **Autocomplete Insertion** (`at_mention_item/index.tsx`):
   - Modified to insert display names into the text field when users select from autocomplete
   - Uses `displayUsername()` utility to respect user's "Teammate Name Display" setting

2. **Pre-Submission Conversion** (`handle_send_message.ts`):
   - Converts display names back to usernames before sending the post to the server
   - Builds a reverse mapping of display names → usernames
   - Uses regex pattern matching to replace `@DisplayName` with `@username`

---

## Files Modified

### 1. `app/components/autocomplete/at_mention_item/index.tsx`

**Purpose:** Handles mention autocomplete item rendering and insertion into text field

**Lines Modified:** 1-85 (entire file modified)

**Key Changes:**
- Added imports for database access, user queries, and display name utilities
- Modified `completeMention` callback to use display names instead of usernames
- Added async logic to fetch teammate name display setting and calculate display names

---

### 2. `app/hooks/handle_send_message.ts`

**Purpose:** Handles post submission and converts display names to usernames before sending to server

**Lines Modified:** 18-29 (imports), 112-197 (conversion logic in `doSubmitMessage`)

**Key Changes:**
- Added imports for database access, user queries, and display name utilities
- Added display name to username conversion logic in `doSubmitMessage()` function
- Builds reverse mapping of display names → usernames
- Performs regex-based replacement before sending message

---

## Changes Made

### Change 1: Modified `at_mention_item/index.tsx`

**Location:** Lines 29-73

**Before:**
```typescript
const completeMention = useCallback((u: UserModel | UserProfile) => {
    onPress?.(u.username);
}, []);
```

**After:**
```typescript
const completeMention = useCallback((u: UserModel | UserProfile) => {
    (async () => {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const teammateNameDisplay = await getTeammateNameDisplay(database);
            const currentUser = await getCurrentUser(database);
            const locale = currentUser?.locale || intl.locale;

            const displayName = displayUsername(u, locale, teammateNameDisplay, false);

            if (displayName !== u.username && displayName.includes(' ')) {
                onPress?.(displayName);
            } else {
                onPress?.(u.username);
            }
        } catch (error) {
            onPress?.(u.username);
        }
    })();
}, [serverUrl, intl, onPress]);
```

**Key Changes:**
- Made callback async to fetch database settings
- Gets teammate name display setting from database
- Calculates display name using `displayUsername()` utility
- Only uses display name if different from username and contains spaces
- Falls back to username on error

---

### Change 2: Modified `handle_send_message.ts` - Added Imports

**Location:** Lines 18-29

**Added Imports:**
```typescript
import DatabaseManager from '@database/manager';
import {queryAllUsers, getTeammateNameDisplay, getCurrentUser} from '@queries/servers/user';
import {logError} from '@utils/log';
import {confirmOutOfOfficeDisabled, displayUsername} from '@utils/user';
```

---

### Change 3: Modified `handle_send_message.ts` - Added Conversion Logic

**Location:** Lines 112-197 (inside `doSubmitMessage` function)

**Before:**
```typescript
const doSubmitMessage = useCallback(async (schedulingInfo?: SchedulingInfo) => {
    const postFiles = files.filter((f) => !f.failed);
    const post = {
        user_id: currentUserId,
        channel_id: channelId,
        root_id: rootId,
        message: value,
    } as Post;
```

**After:**
```typescript
const doSubmitMessage = useCallback(async (schedulingInfo?: SchedulingInfo) => {
    const postFiles = files.filter((f) => !f.failed);

    // Display name to username conversion logic
    let message = value;

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const users = await queryAllUsers(database).fetch();
        const currentUser = await getCurrentUser(database);
        const teammateNameDisplay = await getTeammateNameDisplay(database);
        const locale = currentUser?.locale || intl.locale;

        const displayNameToUsername = new Map<string, string>();

        for (const user of users) {
            const displayName = displayUsername(user, locale, teammateNameDisplay, false);

            if (displayName !== user.username && displayName.includes(' ')) {
                const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                displayNameToUsername.set(escapedDisplayName, user.username);
            }
        }

        if (displayNameToUsername.size > 0) {
            const sortedDisplayNames = Array.from(displayNameToUsername.keys()).sort((a, b) => b.length - a.length);

            for (const displayName of sortedDisplayNames) {
                const username = displayNameToUsername.get(displayName)!;
                const regex = new RegExp(`@${displayName}(?=\\s|$|[^\\w\\s-])`, 'g');
                message = message.replace(regex, `@${username}`);
            }
        }
    } catch (error) {
        logError(error, 'Failed to convert display names to usernames');
    }

    const post = {
        user_id: currentUserId,
        channel_id: channelId,
        root_id: rootId,
        message, // ← Now uses converted message
    } as Post;
```

**Key Changes:**
- Added conversion logic before post creation
- Builds reverse mapping of display names to usernames
- Escapes special regex characters for safety
- Sorts by length to handle nested names
- Uses regex pattern matching for replacement
- Falls back to original message on error

---

## How It Works

### Step-by-Step Flow

1. **User Types "@" in Text Field**
   - Autocomplete dropdown appears
   - Shows users with their display names (based on "Teammate Name Display" setting)

2. **User Selects "John Doe" from Dropdown**
   - `at_mention_item/index.tsx` inserts `@John Doe` into the text field
   - User sees the friendly display name

3. **User Types More Text and Submits**
   - Example message: `"Hey @John Doe, can you review this?"`
   - User sees display name in the text field

4. **Pre-Submission Conversion (`handle_send_message.ts`)**
   - `doSubmitMessage()` function is called
   - Conversion logic runs:
     - Gets all users from database
     - Builds mapping: `{"John Doe" → "john.doe"}`
     - Escapes special characters
     - Sorts by length (if multiple matches)
     - Replaces `@John Doe` with `@john.doe` using regex
   - Result: `"Hey @john.doe, can you review this?"`

5. **Post Sent to Server**
   - Server receives message with username: `"Hey @john.doe, can you review this?"`
   - Server parses mentions correctly
   - Notifications sent to correct user
   - Mention highlighting works properly

6. **Post Displayed**
   - Server returns post with mentions processed
   - Frontend displays post with display names (as configured)
   - User sees: `"Hey @John Doe, can you review this?"` in the post

### Edge Cases Handled

1. **Nested Names**
   - If users have "John Doe" and "John Doe Jr"
   - Sorted by length (longest first)
   - "John Doe Jr" is matched before "John Doe"

2. **Special Characters in Names**
   - Names with regex special characters (e.g., "John (Admin)")
   - Escaped before regex matching: `"John \\(Admin\\)"`

3. **Names Without Spaces**
   - Only converts names with spaces (full names)
   - Usernames that match display names are not converted

4. **Multiple Mentions**
   - Handles multiple mentions in one message
   - Each mention is converted independently

5. **Error Handling**
   - Falls back to username if database access fails
   - Falls back to original message if conversion fails
   - Ensures messages are always sent

---

## Testing

### Manual Testing Scenarios

1. **Basic Mention Conversion**
   - Select user with display name "John Doe" (username: "john.doe")
   - Type message: `"Hey @John Doe"`
   - Submit post
   - Verify: Server receives `"Hey @john.doe"`

2. **Multiple Mentions**
   - Select multiple users with display names
   - Type: `"Hey @John Doe and @Jane Smith"`
   - Submit post
   - Verify: Server receives `"Hey @john.doe and @jane.smith"`

3. **Nested Names**
   - Have users "John Doe" and "John Doe Jr"
   - Mention "John Doe Jr"
   - Verify: Correctly converts to username of "John Doe Jr", not "John Doe"

4. **Special Characters**
   - User with display name "John (Admin)"
   - Mention this user
   - Verify: Correctly converts despite parentheses

5. **Mixed Content**
   - Type: `"Hey @John Doe, check this: https://example.com"`
   - Verify: Only mention is converted, URL is preserved

6. **Error Cases**
   - Test with database unavailable
   - Verify: Falls back to username gracefully
   - Verify: Message is still sent

---

## Reverting Changes

If something goes wrong and you need to revert all changes, follow these steps:

### Step 1: Revert `app/components/autocomplete/at_mention_item/index.tsx`

**Replace the entire file with:**

```typescript
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import UserItem from '@components/user_item';

import type UserModel from '@typings/database/models/servers/user';

type AtMentionItemProps = {
    user: UserProfile | UserModel;
    onPress?: (username: string) => void;
    testID?: string;
}

const AtMentionItem = ({
    user,
    onPress,
    testID,
}: AtMentionItemProps) => {
    const completeMention = useCallback((u: UserModel | UserProfile) => {
        onPress?.(u.username);
    }, []);

    return (
        <UserItem
            user={user}
            testID={testID}
            onUserPress={completeMention}
        />
    );
};

export default AtMentionItem;
```

### Step 2: Revert `app/hooks/handle_send_message.ts`

**Remove the added imports (lines 19, 21, 25, 27-29):**

```typescript
// REMOVE THESE LINES:
import DatabaseManager from '@database/manager';
import {queryAllUsers, getTeammateNameDisplay, getCurrentUser} from '@queries/servers/user';
import {logError} from '@utils/log';
// Also remove displayUsername from the import on line 29:
// Change: import {confirmOutOfOfficeDisabled, displayUsername} from '@utils/user';
// To:     import {confirmOutOfOfficeDisabled} from '@utils/user';
```

**Replace the `doSubmitMessage` function (lines 112-197) with:**

```typescript
const doSubmitMessage = useCallback(async (schedulingInfo?: SchedulingInfo) => {
    const postFiles = files.filter((f) => !f.failed);
    const post = {
        user_id: currentUserId,
        channel_id: channelId,
        root_id: rootId,
        message: value,
    } as Post;

    if (!rootId && (
        postPriority.priority ||
        postPriority.requested_ack ||
        postPriority.persistent_notifications)
    ) {
        post.metadata = {
            priority: postPriority,
        };
    }

    let response: CreateResponse;
    if (schedulingInfo) {
        response = await createScheduledPost(serverUrl, scheduledPostFromPost(post, schedulingInfo, postPriority, postFiles));
        if (response.error) {
            showSnackBar({
                barType: SNACK_BAR_TYPE.SCHEDULED_POST_CREATION_ERROR,
                customMessage: getErrorMessage(response.error),
                type: MESSAGE_TYPE.ERROR,
            });
        } else {
            clearDraft();
        }
    } else if (isFromDraftView) {
        const shouldClearDraft = await canPostDraftInChannelOrThread({
            serverUrl,
            rootId,
            intl,
            canPost,
            channelIsArchived,
            channelIsReadOnly,
            deactivatedChannel,
        });

        if (!shouldClearDraft) {
            return;
        }

        createPost(serverUrl, post, postFiles);
        clearDraft();

        // Early return to avoid calling DeviceEventEmitter.emit
        return;
    } else {
        // Response error is handled at the post level so don't have to wait to clear draft
        createPost(serverUrl, post, postFiles);
        clearDraft();
    }

    setSendingMessage(false);
    DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, rootId ? Screens.THREAD : Screens.CHANNEL);
}, [files, currentUserId, channelId, rootId, value, postPriority, isFromDraftView, serverUrl, intl, canPost, channelIsArchived, channelIsReadOnly, deactivatedChannel, clearDraft]);
```

### Step 3: Verify Reversion

After reverting:

1. **Test Mention Autocomplete**
   - Type "@" in text field
   - Select a user
   - Verify: Username appears in text field (not display name)

2. **Test Message Sending**
   - Send a message with mentions
   - Verify: Message sends successfully
   - Verify: Mentions work correctly on server

3. **Check for Errors**
   - Check console for any errors
   - Verify app runs without crashes

### Quick Revert Command (Git)

If you're using Git and want to revert quickly:

```bash
# Revert specific files
git checkout HEAD -- app/components/autocomplete/at_mention_item/index.tsx
git checkout HEAD -- app/hooks/handle_send_message.ts

# Or revert entire commit if this was a single commit
git revert <commit-hash>
```

---

## Troubleshooting

### Issue: Mentions not converting to usernames

**Symptoms:**
- Display names appear in text field (correct)
- But server receives display names instead of usernames (incorrect)

**Possible Causes:**
1. Database access failing silently
2. Conversion logic not running
3. Regex pattern not matching

**Solutions:**
1. Check console for errors from `logError`
2. Verify database is accessible
3. Check that `doSubmitMessage` is being called
4. Verify users have display names with spaces

### Issue: Mentions not showing as display names

**Symptoms:**
- Usernames appear in text field instead of display names

**Possible Causes:**
1. `completeMention` callback not using display names
2. Database query failing
3. Display name calculation returning username

**Solutions:**
1. Check that `at_mention_item/index.tsx` changes are present
2. Verify database access in autocomplete component
3. Check "Teammate Name Display" setting
4. Verify user has first_name and last_name set

### Issue: Performance problems

**Symptoms:**
- Slow autocomplete or message sending
- App freezing when selecting mentions

**Possible Causes:**
1. Loading all users on every mention selection
2. Conversion logic running on every message send

**Solutions:**
1. Consider caching display name mapping
2. Only build mapping when needed
3. Optimize database queries

### Issue: Special characters breaking mentions

**Symptoms:**
- Mentions with special characters not converting
- Regex errors in console

**Possible Causes:**
1. Special characters not properly escaped
2. Regex pattern too strict

**Solutions:**
1. Check escape logic in conversion code
2. Verify regex pattern handles all cases
3. Test with various special characters

---

## Related Files

- `app/utils/user/index.ts` - Contains `displayUsername()` utility function
- `app/helpers/api/preference.ts` - Contains `getTeammateNameDisplaySetting()` function
- `app/components/markdown/at_mention/at_mention.tsx` - Renders mentions in posts
- `app/components/autocomplete/at_mention/at_mention.tsx` - Main autocomplete component

---

## Future Considerations

### Potential Improvements

1. **Performance Optimization**
   - Cache the display name → username mapping
   - Only rebuild when users change or preferences update
   - Consider memoization for large teams

2. **Edge Case Handling**
   - Handle display names that are substrings of other display names
   - Improve regex pattern for better boundary detection
   - Handle Unicode characters and emojis in names

3. **Testing**
   - Add comprehensive unit tests
   - Add integration tests
   - Add E2E tests for mention flow

4. **Error Handling**
   - Better error messages for debugging
   - User-facing error notifications if conversion fails
   - Logging for troubleshooting

---

## Summary

This feature successfully implements display name support in mention autocomplete while maintaining server compatibility. Users now see friendly full names in the text field, while the server receives the correct usernames for processing.

**Key Benefits:**
- ✅ Better user experience (readable names in text field)
- ✅ Server compatibility (receives usernames)
- ✅ No breaking changes (backward compatible)
- ✅ Well documented (comments and this doc)
- ✅ Handles edge cases (nested names, special chars)
- ✅ Error handling (graceful fallbacks)

**Files Changed:**
- `app/components/autocomplete/at_mention_item/index.tsx`
- `app/hooks/handle_send_message.ts`

**Lines of Code Added:** ~100 lines (including comments)

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Author:** Development Team

