# Performance Profiling Utilities

This directory contains three specialized performance profiling utilities for measuring and analyzing performance in the Mattermost Mobile app. These tools are designed to help identify bottlenecks and optimize rendering performance.

## Table of Contents

- [Configuration](#configuration)
- [Observable Profiler](#observable-profiler)
- [Post List Performance Tracker](#post-list-performance-tracker)
- [React Profiler](#react-profiler)
- [Best Practices](#best-practices)

---

## Configuration

All profilers are disabled by default and only work in development mode (`__DEV__`). Enable them in [assets/base/config.json](../../../assets/base/config.json):

```json
{
  "EnableObservableProfiling": true,
  "EnablePostListPerformance": true
}
```

---

## Observable Profiler

Profiles WatermelonDB observable resolution timing to understand which observables are slow and whether they resolve in parallel or serially.

### Import

```typescript
import observableProfiler from '@utils/performance/observable_profiler';
```

### Usage

#### Wrap Observables

Wrap observables returned by WatermelonDB queries to track their timing:

```typescript
import {withObservables} from '@nozbe/watermelondb/react';
import observableProfiler from '@utils/performance/observable_profiler';

const enhance = withObservables(['postId'], ({postId, database}) => {
    const post = database.get('Post').findAndObserve(postId);
    const user = post.observe().pipe(
        switchMap((p) => p.author.observe())
    );

    return {
        post: observableProfiler.profile(post, 'post', 'Post', postId),
        user: observableProfiler.profile(user, 'user', 'Post', postId),
    };
});
```

#### Analyze Component Performance

After rendering, analyze how observables resolved:

```typescript
// Analyze a specific component instance
observableProfiler.analyzeComponent('Post', postId);

// Analyze all components of a specific type
observableProfiler.analyzeComponentsByPrefix('Post');
observableProfiler.analyzeComponentsByPrefix('Channel');
observableProfiler.analyzeComponentsByPrefix('User');

// Print emission counts
observableProfiler.printEmissionSummary('Post', postId);
```

#### Manual Control

```typescript
// Enable/disable profiling
observableProfiler.setEnabled(true);

// Check if enabled
const isEnabled = observableProfiler.isEnabled();

// Clear collected data
observableProfiler.clear();

// Get timing data
const timings = observableProfiler.getTimings('Post', postId);
const allTimings = observableProfiler.getAllTimings();

// Conditionally profile (checks __DEV__ and enabled state)
observableProfiler.profileIfEnabled(observable$, 'name', 'Component', 'id');
```

### Output

The profiler identifies three patterns:

1. **WATERFALL**: Observables resolving serially (avgGap > 5ms)
   - Indicates blocking database queries
   - Consider batching queries or optimizing schema

2. **BATCH PATTERN**: Mostly parallel with occasional blocks (avgGap ≤ 5ms, maxGap > 20ms)
   - Some observables blocked, then released together
   - Check for database locks or synchronous operations

3. **PARALLEL**: Observables resolving concurrently (avgGap ≤ 5ms, maxGap ≤ 20ms)
   - Optimal performance
   - Queries executing efficiently

### Example Output

```
═══════════════════════════════════════════════════════
  OBSERVABLE ANALYSIS: Post:abc123
═══════════════════════════════════════════════════════
  Total Observables: 5
  Emitted: 5 | Pending: 0
  Time Span: 45.32ms (from first subscribe to last emit)
───────────────────────────────────────────────────────
  EMISSION TIMELINE (chronological):
      10.23ms: post
      12.45ms: user (+2.22ms gap)
      15.67ms: channel (+3.22ms gap)
      18.90ms: reactions (+3.23ms gap)
      45.32ms: customEmojis (+26.42ms gap)
───────────────────────────────────────────────────────
  SLOWEST OBSERVABLES:
      45.32ms: customEmojis
      18.90ms: reactions
      15.67ms: channel
───────────────────────────────────────────────────────
  RESOLUTION PATTERN:
    Average gap between emissions: 8.77ms
    Max gap between emissions: 26.42ms
    ⚠️  WATERFALL DETECTED: Observables resolving serially
═══════════════════════════════════════════════════════
```

When analyzing by prefix:

```
═══════════════════════════════════════════════════════
  POST OBSERVABLE ANALYSIS (50 components)
═══════════════════════════════════════════════════════
  OBSERVABLE PERFORMANCE SUMMARY:
  (Averaged across all Post components)

  Observable Name                    Count   Avg       P50       Max
  ──────────────────────────────────────────────────────────────────
  customEmojis                       50      42.3ms    38.5ms    89.2ms
  reactions                          50      18.4ms    16.2ms    34.5ms
  channel                            48      15.2ms    14.1ms    28.9ms
  user                               50      12.7ms    11.3ms    25.1ms
  post                               50      10.5ms    9.8ms     22.3ms

  🎯 TOP 3 OPTIMIZATION TARGETS:
     1. customEmojis: 42.3ms avg (2115ms total impact)
     2. reactions: 18.4ms avg (920ms total impact)
     3. channel: 15.2ms avg (730ms total impact)
═══════════════════════════════════════════════════════
```

---

## Post List Performance Tracker

Dedicated performance monitoring for post list optimization. Tracks initial render timing and markdown parsing performance.

### Import

```typescript
import PostListPerformance from '@utils/performance/post_list_performance';
```

### Usage

#### Track Initial Render

```typescript
// In your post list component
useEffect(() => {
    // Start tracking when mounting
    PostListPerformance.startInitialRender(channelId, threadId, posts.length);

    return () => {
        // End tracking when first render completes
        PostListPerformance.endInitialRender(
            channelId,
            threadId,
            renderedCount,
            viewableCount
        );
    };
}, []);
```

#### Track Markdown Parsing

```typescript
// In your markdown component
const parseMarkdown = (text: string, postId: string) => {
    const startTime = performance.now();
    const parsed = markdownParser.parse(text);
    const duration = performance.now() - startTime;

    PostListPerformance.trackMarkdownParse(
        channelId,
        threadId,
        postId,
        text.length,
        duration
    );

    return parsed;
};
```

#### View Results

```typescript
// Print comprehensive summary
PostListPerformance.printSummary(channelId, threadId);

// Clear metrics
PostListPerformance.clearMetrics(channelId, threadId);

// Manual control
PostListPerformance.setEnabled(true);
PostListPerformance.isEnabled();
```

### Example Output

```
═══════════════════════════════════════════════════════
  POST LIST PERFORMANCE REPORT
═══════════════════════════════════════════════════════
  Channel/Thread: channel123
  Architecture:   new
  Platform:       ios
  Post Count:     50
───────────────────────────────────────────────────────
  INITIAL RENDER
    Duration:      245.67ms
    TTI:           0.246s
    Total Posts:   50
    Rendered:      15
    Viewable:      8
───────────────────────────────────────────────────────
  MARKDOWN PARSING
    Parse Count:  50
    Total Time:   123.45ms
    Avg per Post: 2.47ms
    P50:          1.89ms
    P95:          5.23ms
    P99:          8.91ms
═══════════════════════════════════════════════════════
```

---

## React Profiler

Tracks React component render timing to identify rendering bottlenecks and memoization opportunities.

### Import

```typescript
import ReactProfiler from '@utils/performance/react_profiler';
```

### Usage

#### Wrap Components with React.Profiler

```tsx
import {Profiler} from 'react';
import ReactProfiler from '@utils/performance/react_profiler';

const PostList = ({posts}) => {
    return (
        <Profiler id="PostList" onRender={ReactProfiler.onRender}>
            {posts.map((post) => (
                <Profiler key={post.id} id={`Post-${post.id}`} onRender={ReactProfiler.onRender}>
                    <Post post={post} />
                </Profiler>
            ))}
        </Profiler>
    );
};
```

#### Analyze Results

```typescript
// Get metrics for specific component
const metrics = ReactProfiler.getMetrics('PostList');

// Get all metrics
const allMetrics = ReactProfiler.getAllMetrics();

// Print summary report
ReactProfiler.printSummary();

// Clear metrics
ReactProfiler.clearMetrics(); // Clear all
ReactProfiler.clearMetrics('PostList'); // Clear specific component

// Manual control
ReactProfiler.setEnabled(true);
ReactProfiler.isEnabled();
```

### Example Output

```
═══════════════════════════════════════════════════════
  REACT PROFILER REPORT
═══════════════════════════════════════════════════════
  TOP SLOWEST COMPONENTS:
───────────────────────────────────────────────────────
  1. PostList
     Total Time:    523.45ms
     Avg per Render: 87.24ms
     Renders:       6 (1 mount, 5 update)
     Base Duration: 445.32ms
     ⚠️  Memoization opportunity: 18% slower than optimized

  2. MarkdownText
     Total Time:    234.56ms
     Avg per Render: 11.73ms
     Renders:       20 (20 mount, 0 update)
     Base Duration: 220.15ms

  3. PostHeader
     Total Time:    156.78ms
     Avg per Render: 7.84ms
     Renders:       20 (20 mount, 0 update)
     Base Duration: 148.90ms
───────────────────────────────────────────────────────
  TOTAL PROFILED TIME: 914.79ms
═══════════════════════════════════════════════════════
```

### Understanding the Metrics

- **actualDuration**: Actual time spent rendering (includes effects)
- **baseDuration**: Estimated time without memoization
- **mount**: Initial render of component
- **update**: Re-render due to state/props change
- **nested-update**: Update triggered by parent update

**Memoization Warning**: Shows when `actualDuration` is significantly higher than `baseDuration`, indicating potential optimization opportunities with `React.memo`, `useMemo`, or `useCallback`.

---

## Best Practices

### When to Use Each Profiler

- **Observable Profiler**: Use when debugging slow database queries or understanding data flow patterns
- **Post List Performance**: Use for baseline measurements and optimization tracking
- **React Profiler**: Use when components re-render frequently or render times are slow

### Performance Tips

1. **Always disable in production**: These profilers add overhead
2. **Profile in realistic conditions**: Use production-like data volumes
3. **Profile on actual devices**: Simulators/emulators don't reflect real performance
4. **Clear metrics between tests**: Avoid contaminating measurements
5. **Focus on patterns, not individual measurements**: Look for trends across multiple renders

### Common Issues

**Observable Profiler shows WATERFALL pattern:**
- Check for sequential queries that could be batched
- Review database schema for missing indexes
- Consider using `Q.experimentalJoinTables` for related data

**Post List shows high markdown parse times:**
- Consider memoizing parsed markdown
- Evaluate if simpler markdown subset is sufficient
- Profile on actual message content (links, code blocks, etc.)

**React Profiler shows frequent re-renders:**
- Wrap expensive components with `React.memo`
- Memoize callbacks with `useCallback`
- Memoize computed values with `useMemo`
- Check if props are being recreated unnecessarily

### Example Workflow

```typescript
// 1. Enable profilers
observableProfiler.setEnabled(true);
PostListPerformance.setEnabled(true);
ReactProfiler.setEnabled(true);

// 2. Navigate to post list
// ... user navigates to channel ...

// 3. Wait for initial render
await new Promise(resolve => setTimeout(resolve, 1000));

// 4. Analyze results
PostListPerformance.printSummary(channelId);
observableProfiler.analyzeComponentsByPrefix('Post');
ReactProfiler.printSummary();

// 5. Clear and repeat
observableProfiler.clear();
PostListPerformance.clearMetrics(channelId);
ReactProfiler.clearMetrics();
```

---

## Architecture Detection

The Post List Performance Tracker automatically detects whether the app is running on the New or Old React Native architecture:

- **New Architecture**: TurboModules enabled (React Native 0.76+)
- **Old Architecture**: Legacy bridge

This is useful for comparing performance between architectures during migration.

---

## Development Notes

- All profilers check `__DEV__` to ensure they don't run in production
- Config flags provide additional control beyond `__DEV__`
- Profilers use `react-native-performance` for accurate timing
- Observable Profiler uses RxJS operators to intercept emissions
- React Profiler uses React's built-in Profiler API

---

## See Also

- [WatermelonDB Documentation](https://watermelondb.dev/docs)
- [React Profiler API](https://react.dev/reference/react/Profiler)
- [React Native Performance](https://github.com/oblador/react-native-performance)
