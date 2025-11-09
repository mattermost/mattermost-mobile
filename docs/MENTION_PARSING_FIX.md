# Mention Parsing Fix for UUID Usernames

## Issue Description

When users mentioned other users with UUID-like usernames (e.g., `@927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8`), the mentions were:
- ✅ **Detected correctly** during message sending
- ✅ **Sent successfully** to the server
- ❌ **NOT rendered as clickable mentions** in the mobile app UI
- ❌ **Displayed as plain text** instead of styled, clickable mention links

The same mentions worked correctly on the web version, indicating a mobile-specific parsing issue.

## Root Cause

The issue was in the **markdown parsing pipeline**. The Mattermost mobile app uses `@mattermost/commonmark` (a custom fork of CommonMark) to parse messages and convert them into an Abstract Syntax Tree (AST).

### Why UUID Mentions Failed

1. **Parser Limitation**: The `@mattermost/commonmark` parser's mention detection didn't automatically parse UUID-like usernames (containing hyphens and long alphanumeric strings) as `at_mention` nodes.

2. **AST Structure**: When a mention like `@927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8` was typed:
   - The parser created a **text node** with the literal string `@927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8`
   - It did **NOT** create an `at_mention` node
   - Without an `at_mention` node, the `AtMention` component was never called
   - Result: Plain text rendering

3. **Why Regular Usernames Worked**: Usernames like `@ashifali221` were likely parsed correctly by the parser's built-in mention detection, creating proper `at_mention` nodes.

## Solution

### Files Modified

1. **`app/components/markdown/transform.ts`**
   - Added `transformMentionsInText()` function
   - Scans text nodes for `@mention` patterns (including UUIDs)
   - Converts matching text nodes into `at_mention` nodes

2. **`app/components/markdown/markdown.tsx`**
   - Added import for `transformMentionsInText`
   - Integrated the function into the parsing pipeline (after `parseTaskLists`, before `highlightMentions`)

### How It Works

```typescript
// Before transformMentionsInText():
AST: [text node: "@927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8"]
     ↓
     Renders as: plain text

// After transformMentionsInText():
AST: [at_mention node: "927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8"]
     ↓
     AtMention component renders it
     ↓
     Renders as: styled, clickable mention
```

### Implementation Details

The `transformMentionsInText()` function:

1. **Walks the AST** using a walker to find all text nodes
2. **Searches for mentions** using regex pattern: `/@([a-z0-9.\-_]+)/gi`
   - Matches `@` followed by alphanumeric characters, dots, hyphens, underscores
   - Includes UUID patterns like `927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8`
3. **Splits text nodes** into:
   - Text before mention (if any)
   - `at_mention` node
   - Text after mention (if any)
4. **Manually constructs AST relationships** (`_parent`, `_prev`, `_next`, etc.) to maintain tree structure
5. **Skips mentions inside code blocks/links** to avoid breaking code syntax

### Parsing Pipeline Order

The function is called in this order (critical for correctness):

```
1. parser.parse()           - Initial parsing
2. combineTextNodes()       - Merge adjacent text nodes
3. addListItemIndices()     - Add list item numbers
4. pullOutImages()          - Extract images
5. parseTaskLists()         - Parse checkbox lists
6. transformMentionsInText() ← OUR FIX (converts text to mentions)
7. highlightMentions()      - Apply mention highlighting
8. highlightWithoutNotification()
9. highlightSearchPatterns()
```

**Why this order matters**: Mentions must be converted to `at_mention` nodes BEFORE `highlightMentions()` runs, because `highlightMentions()` expects `at_mention` nodes to exist.

## Technical Details

### Regex Pattern

```typescript
/@([a-z0-9.\-_]+)/gi
```

- `@` - Literal at symbol
- `([a-z0-9.\-_]+)` - Capture group for username
  - `a-z0-9` - Alphanumeric
  - `.` - Dots (for usernames like `user.name`)
  - `-` - Hyphens (for UUIDs)
  - `_` - Underscores
  - `+` - One or more characters
- `g` - Global flag (find all matches)
- `i` - Case insensitive

### AST Manipulation

The function manually manipulates the AST structure by:
- Creating new `Node('at_mention')` nodes
- Setting `_parent`, `_prev`, `_next` relationships
- Updating parent's `_firstChild` and `_lastChild` references
- Using TypeScript `as any` casts to access private `_parent`, `_prev`, `_next` properties

This is necessary because the CommonMark Node type doesn't expose these properties in its TypeScript definition, but they exist at runtime.

## Testing

To verify the fix works:

1. Send a message with a UUID mention: `@927e3ca3-7ea5-49ec-84d2-3e883f8ee7f8`
2. The mention should:
   - ✅ Render with mention styling (not plain text)
   - ✅ Be clickable once user data is loaded
   - ✅ Display correctly in the message list

## Related Files

- `app/components/markdown/at_mention/at_mention.tsx` - Component that renders mentions
- `app/components/markdown/at_mention/index.ts` - Database queries for user lookup
- `app/hooks/markdown.ts` - `useMemoMentionedUser` hook for finding users

## Future Considerations

- The parser (`@mattermost/commonmark`) may be updated in the future to handle UUID mentions natively
- If that happens, `transformMentionsInText()` could be removed, but it serves as a safety net
- The function only processes the first mention per text node to avoid complexity; multiple mentions in one text node would require recursive processing

