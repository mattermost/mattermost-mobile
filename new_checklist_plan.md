# Implementation Plan: Add Checklist Name Customization Screen

## Overview
When a user clicks the "+" button in the channel header (with no active runs), instead of immediately creating a checklist with the default name, we'll navigate to a new screen where they can customize the name before creation.

## Current Flow
1. User clicks playbook button in channel header (shows "+" when no active runs)
2. `openPlaybooksRuns()` checks if `playbooksActiveRuns === 0`
3. If yes, calls `handleCreateQuickRun()` which immediately creates a checklist with name `{channelName} Checklist`
4. Navigates to the newly created playbook run

**Location:** `app/screens/channel/header/header.tsx:222-257`

## New Flow
1. User clicks playbook button in channel header (shows "+" when no active runs)
2. `openPlaybooksRuns()` checks if `playbooksActiveRuns === 0`
3. If yes, navigates to **new screen** with pre-populated name
4. User can modify name and description
5. User clicks Create button
6. Creates checklist and navigates to it

## Changes Required

### 1. Create New Screen Component

**New File:** `app/products/playbooks/screens/create_quick_checklist/create_quick_checklist.tsx`

**Features:**
- Similar to `start_a_run.tsx` but simplified (no playbook selection, no channel linking)
- Use `FloatingTextInput` for checklist name (required field)
- Optional `FloatingTextInput` for description
- Pre-populate name field with `{channelName} Checklist` (passed as prop)
- Navigation: Close button (left), Create button (right)
- Create button disabled when `name.trim()` is empty
- Use `useNavButtonPressed` for button handlers
- Use `useAndroidHardwareBackHandler` for back button handling
- Use `setButtons` in `useEffect` to update navigation buttons
- Define button ID constants (`CLOSE_BUTTON_ID`, `CREATE_BUTTON_ID`)
- On Create:
  - Wrap create handler with `usePreventDoubleTap` to prevent double submissions
  - Call `createPlaybookRun(serverUrl, '', currentUserId, teamId, name, description, channelId)`
  - On success: 
    - Call `fetchPlaybookRunsForChannel(serverUrl, channelId)` to refresh runs
    - Navigate to new run via `goToPlaybookRun(intl, res.data.id)`
  - On error: Log error with `logError` and show error snackbar
- Use `SafeAreaView` and `ScrollView` layout pattern
- Use `Keyboard.dismiss()` when closing screen

**Props:**
```typescript
type Props = {
    componentId: AvailableScreens;
    channelId: string;
    channelName: string;
    currentUserId: string;
    currentTeamId: string;
    serverUrl: string;
}
```

**State:**
- `checklistName: string` - initialized with `${channelName} Checklist` in `useState` initializer
- `description: string` - initialized with empty string
- `canSave: boolean` - computed from `checklistName.trim() !== ''`

**Constants:**
- `CLOSE_BUTTON_ID = 'close-create-quick-checklist'`
- `CREATE_BUTTON_ID = 'create-quick-checklist'`

**Imports Required:**
- `fetchPlaybookRunsForChannel` from `@playbooks/actions/remote/runs`
- `useServerUrl` hook from `@context/server`
- `useIntl` hook from `react-intl`
- `useTheme` hook from `@context/theme`
- `useNavButtonPressed` from `@hooks/navigation_button_pressed`
- `useAndroidHardwareBackHandler` from `@hooks/android_back_handler`
- `usePreventDoubleTap` from `@hooks/utils`
- `setButtons`, `popTopScreen` from `@screens/navigation`
- `logError` from `@utils/log`
- `getFullErrorMessage` from `@utils/errors`
- `Keyboard` from `react-native`

**References:**
- Pattern: `app/products/playbooks/screens/start_a_run/start_a_run.tsx`
- Similar input: `app/products/playbooks/screens/playbook_run/checklist/rename_checklist_bottom_sheet.tsx`

### 2. Register Screen in Navigation System

#### File: `app/products/playbooks/constants/screens.ts`
**Change:** Add new screen constant
```typescript
export const PLAYBOOKS_CREATE_QUICK_CHECKLIST = 'PlaybooksCreateQuickChecklist';
```

#### File: `app/products/playbooks/screens/index.tsx`
**Change:** Add case in `loadPlaybooksScreen()` switch statement
```typescript
case Screens.PLAYBOOKS_CREATE_QUICK_CHECKLIST:
    const CreateQuickChecklistScreen = require('./create_quick_checklist').default;
    return CreateQuickChecklistScreen;
```

#### File: `app/products/playbooks/screens/navigation.ts`
**Change:** Add navigation function
```typescript
export const goToCreateQuickChecklist = (
    intl: IntlShape,
    channelId: string,
    channelName: string,
    currentUserId: string,
    currentTeamId: string,
    serverUrl: string,
) => {
    const screen = Screens.PLAYBOOKS_CREATE_QUICK_CHECKLIST;
    const title = intl.formatMessage({id: 'mobile.playbook.create_checklist', defaultMessage: 'Create Checklist'});

    goToScreen(screen, title, {
        channelId,
        channelName,
        currentUserId,
        currentTeamId,
        serverUrl,
    }, {}); // Empty options, no subtitle needed
};
```

### 3. Modify Channel Header Handler

#### File: `app/screens/channel/header/header.tsx`

**Change 1:** Modify or replace `handleCreateQuickRun` (lines 222-243)
```typescript
const handleCreateQuickRun = useCallback(() => {
    goToCreateQuickChecklist(
        intl,
        channelId,
        displayName,
        currentUserId,
        teamId,
        serverUrl,
    );
}, [intl, channelId, displayName, currentUserId, teamId, serverUrl]);
```

**Alternative:** Rename function to `handleOpenQuickChecklistScreen` for clarity

**Note:** Keep the `openPlaybooksRuns` callback unchanged (lines 245-257) - it already calls `handleCreateQuickRun()`

### 4. Update Tests

#### File: `app/screens/channel/header/header.test.tsx`
**Change:** Update test at lines 175-190+ that expects immediate creation
- Change expectation from `createPlaybookRun` being called
- To: Navigation function being called with correct parameters

**Before:**
```typescript
expect(createPlaybookRun).toHaveBeenCalledWith(
    serverUrl,
    '',
    currentUserId,
    teamId,
    'Test Channel Checklist',
    '',
    channelId,
);
```

**After:**
```typescript
expect(goToCreateQuickChecklist).toHaveBeenCalledWith(
    expect.anything(), // intl
    channelId,
    'Test Channel',
    currentUserId,
    teamId,
    serverUrl,
);
```

#### New File: `app/products/playbooks/screens/create_quick_checklist/create_quick_checklist.test.tsx`
**Tests to add:**
1. Screen renders with pre-populated name (default name pattern `{channelName} Checklist`)
2. Create button is disabled when name is empty
3. Create button is enabled when name has content
4. Create button calls `createPlaybookRun` with correct parameters
5. Successful creation calls `fetchPlaybookRunsForChannel` before navigating
6. Successful creation navigates to the new run
7. Error handling logs error with `logError` and shows snackbar on creation failure
8. Close button dismisses the screen
9. Navigation parameters are passed correctly to the screen
10. Keyboard dismisses when closing screen

### 5. Export New Screen

#### New File: `app/products/playbooks/screens/create_quick_checklist/index.ts`
```typescript
import CreateQuickChecklist from './create_quick_checklist';

export default CreateQuickChecklist;
```

## Key Implementation Details

### Default Values
- **Default Name Pattern:** `{channelName} Checklist` (same as current)
- **Default Description:** Empty string
- **Playbook ID:** Always empty string `''` (standalone checklist)
- **Channel ID:** Use current channel (passed from header)

### Validation
- **Create Button State:** Enabled only when `name.trim() !== ''`
- **Required Fields:** Only name is required, description is optional

### API Call
```typescript
createPlaybookRun(
    serverUrl,
    '',                    // empty playbook_id for standalone checklist
    currentUserId,
    teamId,
    name,                  // user-entered name
    description,           // user-entered description (can be empty)
    channelId,             // current channel
)
```

### Navigation
- **After Creation:** 
  - Call `fetchPlaybookRunsForChannel(serverUrl, channelId)` to refresh runs
  - Navigate to the newly created playbook run using `goToPlaybookRun(intl, runId)`
- **On Cancel:** Close screen using `popTopScreen()` and dismiss keyboard with `Keyboard.dismiss()`

### Error Handling
- Log error with `logError('error on createPlaybookRun', getFullErrorMessage(res.error))`
- Show error snackbar on creation failure using `showPlaybookErrorSnackbar()` helper
- Return early on error to prevent navigation

## Files Summary

### Files to Create
1. `app/products/playbooks/screens/create_quick_checklist/create_quick_checklist.tsx` - Main screen component
2. `app/products/playbooks/screens/create_quick_checklist/index.ts` - Export file
3. `app/products/playbooks/screens/create_quick_checklist/create_quick_checklist.test.tsx` - Tests

### Files to Modify
1. `app/products/playbooks/constants/screens.ts` - Add screen constant
2. `app/products/playbooks/screens/index.tsx` - Register screen
3. `app/products/playbooks/screens/navigation.ts` - Add navigation function
4. `app/screens/channel/header/header.tsx` - Change handler to navigate instead of create directly
5. `app/screens/channel/header/header.test.tsx` - Update test expectations

## Design Notes

### UI Layout
- Follow the pattern from `start_a_run.tsx` for consistency
- Use theme colors and spacing from existing screens
- Maintain the same header button pattern (close left, action right)

### Accessibility
- Ensure proper labels for screen readers
- Test keyboard navigation
- Follow existing accessibility patterns in the codebase

### Performance
- No significant performance concerns - simple form screen
- Minimal re-renders with proper `useState` usage
- **Double-tap Prevention:** Use `usePreventDoubleTap` wrapper for the create handler to prevent accidental double submissions. The `useNavButtonPressed` hook already provides some protection, but `usePreventDoubleTap` adds an extra layer of safety for the async create operation.

## Testing Strategy

1. **Unit Tests:** Test component logic and state management
2. **Integration Tests:** Test navigation flow from header to creation
3. **Manual Testing:**
   - Test with various channel names (special characters, long names)
   - Test empty name validation
   - Test description field (optional)
   - Test successful creation and navigation
   - Test error scenarios

## Future Enhancements (Out of Scope)

- Add checklist item templates
- Add tags/labels during creation
- Add due date selection
- Add assignee selection
