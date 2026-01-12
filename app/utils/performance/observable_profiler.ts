// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Observable Performance Profiler
 *
 * Profiles WatermelonDB observable resolution timing to understand:
 * 1. Which observables are slow
 * 2. Whether they resolve in parallel or serial (waterfall)
 * 3. How withObservables batching affects render timing
 */

import performance from 'react-native-performance';
import {defer, type Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

import LocalConfig from '@assets/config.json';
import {logDebug, logInfo} from '@utils/log';

export interface ObservableTimingData {
    observableName: string;
    componentName: string;
    componentId: string; // e.g., post ID
    subscribeTime: number; // When subscription started
    firstEmitTime?: number; // When first value emitted
    timeToFirstEmit?: number; // Duration from subscribe to first emit (ms)
    emitCount: number;
    lastEmitTime?: number;
}

class ObservableProfiler {
    private timings: Map<string, ObservableTimingData[]> = new Map();
    private enabled = LocalConfig.EnableObservableProfiling && __DEV__; // Only enable in dev builds

    /**
     * Wrap an observable to track its timing
     */
    public profile<T>(
        observable: Observable<T>,
        observableName: string,
        componentName: string,
        componentId: string,
    ): Observable<T> {
        if (!this.enabled) {
            return observable;
        }

        const subscribeTime = performance.now();
        const key = `${componentName}:${componentId}`;

        // Initialize timing data
        const timingData: ObservableTimingData = {
            observableName,
            componentName,
            componentId,
            subscribeTime,
            emitCount: 0,
        };

        // Add to map
        if (!this.timings.has(key)) {
            this.timings.set(key, []);
        }
        this.timings.get(key)!.push(timingData);

        logDebug(`[ObservableProfiler] Subscribed to ${observableName} for ${componentName}:${componentId}`);

        // Use defer to ensure we capture the exact subscription moment
        return defer(() => observable).pipe(
            tap({
                next: () => {
                    const now = performance.now();
                    timingData.emitCount++;

                    if (timingData.firstEmitTime) {
                        // Subsequent emissions - log to track re-render triggers
                        const timeSinceSubscribe = now - subscribeTime;
                        const timeSinceLastEmit = timingData.lastEmitTime ? now - timingData.lastEmitTime : 0;
                        logInfo(
                            `[ObservableProfiler] ${observableName} (${componentName}:${componentId.substring(0, 8)}) ` +
                            `EMIT #${timingData.emitCount} at ${timeSinceSubscribe.toFixed(2)}ms (+${timeSinceLastEmit.toFixed(2)}ms)`,
                        );
                    } else {
                        // First emission
                        timingData.firstEmitTime = now;
                        timingData.timeToFirstEmit = now - subscribeTime;

                        logInfo(
                            `[ObservableProfiler] ${observableName} (${componentName}:${componentId.substring(0, 8)}) ` +
                            `FIRST EMIT after ${timingData.timeToFirstEmit.toFixed(2)}ms`,
                        );
                    }

                    timingData.lastEmitTime = now;
                },
                error: (err) => {
                    logDebug(`[ObservableProfiler] ${observableName} ERROR:`, err);
                },
                complete: () => {
                    logDebug(`[ObservableProfiler] ${observableName} COMPLETED`);
                },
            }),
        );
    }

    /**
     * Get timing data for a specific component instance
     */
    public getTimings(componentName: string, componentId: string): ObservableTimingData[] | undefined {
        const key = `${componentName}:${componentId}`;
        return this.timings.get(key);
    }

    /**
     * Get all timing data
     */
    public getAllTimings(): Map<string, ObservableTimingData[]> {
        return this.timings;
    }

    /**
     * Analyze observable resolution patterns for a component instance
     */
    public analyzeComponent(componentName: string, componentId: string): void {
        const timings = this.getTimings(componentName, componentId);
        if (!timings || timings.length === 0) {
            logInfo(`[ObservableProfiler] No timing data for ${componentName}:${componentId}`);
            return;
        }

        logInfo('');
        logInfo('═══════════════════════════════════════════════════════');
        logInfo(`  OBSERVABLE ANALYSIS: ${componentName}:${componentId.substring(0, 8)}`);
        logInfo('═══════════════════════════════════════════════════════');

        // Sort by first emit time
        const sortedByEmit = [...timings].
            filter((t) => t.firstEmitTime !== undefined).
            sort((a, b) => a.firstEmitTime! - b.firstEmitTime!);

        if (sortedByEmit.length === 0) {
            logInfo('  No observables have emitted yet');
            logInfo('═══════════════════════════════════════════════════════');
            return;
        }

        // Calculate stats
        const firstEmit = sortedByEmit[0];
        const lastEmit = sortedByEmit[sortedByEmit.length - 1];
        const totalSpan = lastEmit.firstEmitTime! - firstEmit.subscribeTime;
        const allEmittedCount = sortedByEmit.length;
        const pendingCount = timings.length - allEmittedCount;

        logInfo(`  Total Observables: ${timings.length}`);
        logInfo(`  Emitted: ${allEmittedCount} | Pending: ${pendingCount}`);
        logInfo(`  Time Span: ${totalSpan.toFixed(2)}ms (from first subscribe to last emit)`);
        logInfo('───────────────────────────────────────────────────────');
        logInfo('  EMISSION TIMELINE (chronological):');

        let prevEmitTime = firstEmit.subscribeTime;
        for (const timing of sortedByEmit) {
            const gap = timing.firstEmitTime! - prevEmitTime;
            const gapStr = gap > 0.5 ? ` (+${gap.toFixed(1)}ms gap)` : '';

            logInfo(
                `    ${timing.timeToFirstEmit!.toFixed(2).padStart(7)}ms: ${timing.observableName}${gapStr}`,
            );

            prevEmitTime = timing.firstEmitTime!;
        }

        logInfo('───────────────────────────────────────────────────────');
        logInfo('  SLOWEST OBSERVABLES:');

        const sortedBySlowest = [...sortedByEmit].
            sort((a, b) => b.timeToFirstEmit! - a.timeToFirstEmit!).
            slice(0, 5);

        for (const timing of sortedBySlowest) {
            logInfo(`    ${timing.timeToFirstEmit!.toFixed(2).padStart(7)}ms: ${timing.observableName}`);
        }

        // Check for waterfall pattern
        logInfo('───────────────────────────────────────────────────────');
        logInfo('  RESOLUTION PATTERN:');

        // Calculate average gap between emissions
        const gaps: number[] = [];
        for (let i = 1; i < sortedByEmit.length; i++) {
            const gap = sortedByEmit[i].firstEmitTime! - sortedByEmit[i - 1].firstEmitTime!;
            gaps.push(gap);
        }

        const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
        const maxGap = Math.max(...gaps);

        logInfo(`    Average gap between emissions: ${avgGap.toFixed(2)}ms`);
        logInfo(`    Max gap between emissions: ${maxGap.toFixed(2)}ms`);

        if (avgGap > 5) {
            logInfo('    ⚠️  WATERFALL DETECTED: Observables resolving serially');
        } else if (maxGap > 20) {
            logInfo('    ⚠️  BATCH PATTERN: Some observables blocked, then batch release');
        } else {
            logInfo('    ✓  PARALLEL: Observables resolving concurrently');
        }

        logInfo('═══════════════════════════════════════════════════════');
        logInfo('');
    }

    /**
     * Analyze all components of a specific type to find patterns
     * @param componentPrefix The component name prefix to filter by (e.g., 'Post', 'Channel')
     */
    public analyzeComponentsByPrefix(componentPrefix: string): void {
        const componentTimings = Array.from(this.timings.entries()).
            filter(([key]) => key.startsWith(`${componentPrefix}:`));

        if (componentTimings.length === 0) {
            logInfo(`[ObservableProfiler] No ${componentPrefix} timing data available`);
            return;
        }

        logInfo('');
        logInfo('═══════════════════════════════════════════════════════');
        logInfo(`  ${componentPrefix.toUpperCase()} OBSERVABLE ANALYSIS (${componentTimings.length} components)`);
        logInfo('═══════════════════════════════════════════════════════');

        // Aggregate statistics across all components
        const observableStats = new Map<string, {count: number; totalTime: number; times: number[]}>();

        for (const [, timings] of componentTimings) {
            for (const timing of timings) {
                if (timing.timeToFirstEmit !== undefined) {
                    if (!observableStats.has(timing.observableName)) {
                        observableStats.set(timing.observableName, {count: 0, totalTime: 0, times: []});
                    }
                    const stats = observableStats.get(timing.observableName)!;
                    stats.count++;
                    stats.totalTime += timing.timeToFirstEmit;
                    stats.times.push(timing.timeToFirstEmit);
                }
            }
        }

        // Calculate averages and sort by slowest
        const sortedStats = Array.from(observableStats.entries()).
            map(([name, stats]) => ({
                name,
                count: stats.count,
                avgTime: stats.totalTime / stats.count,
                maxTime: Math.max(...stats.times),
                minTime: Math.min(...stats.times),
                p50: stats.times.sort((a, b) => a - b)[Math.floor(stats.times.length * 0.5)],
            })).
            sort((a, b) => b.avgTime - a.avgTime);

        logInfo('  OBSERVABLE PERFORMANCE SUMMARY:');
        logInfo(`  (Averaged across all ${componentPrefix} components)`);
        logInfo('');
        logInfo('  Observable Name'.padEnd(35) + 'Count'.padEnd(8) + 'Avg'.padEnd(10) + 'P50'.padEnd(10) + 'Max');
        logInfo('  ' + '─'.repeat(70));

        for (const stat of sortedStats) {
            logInfo(
                `  ${stat.name.padEnd(35)}` +
                `${stat.count.toString().padEnd(8)}` +
                `${stat.avgTime.toFixed(1)}ms`.padEnd(10) +
                `${stat.p50.toFixed(1)}ms`.padEnd(10) +
                `${stat.maxTime.toFixed(1)}ms`,
            );
        }

        // Identify the TOP 3 slowest observables
        logInfo('');
        logInfo('  🎯 TOP 3 OPTIMIZATION TARGETS:');
        for (let i = 0; i < Math.min(3, sortedStats.length); i++) {
            const stat = sortedStats[i];
            const impact = stat.avgTime * stat.count;
            logInfo(`     ${i + 1}. ${stat.name}: ${stat.avgTime.toFixed(1)}ms avg (${impact.toFixed(0)}ms total impact)`);
        }

        logInfo('═══════════════════════════════════════════════════════');
        logInfo('');
    }

    /**
     * Print emission count summary for a specific component
     */
    public printEmissionSummary(componentName: string, componentId: string): void {
        const timings = this.getTimings(componentName, componentId);
        if (!timings || timings.length === 0) {
            logInfo(`[ObservableProfiler] No timing data for ${componentName}:${componentId}`);
            return;
        }

        logInfo('');
        logInfo('═══════════════════════════════════════════════════════');
        logInfo(`  OBSERVABLE EMISSION COUNTS: ${componentName}:${componentId.substring(0, 8)}`);
        logInfo('═══════════════════════════════════════════════════════');

        // Sort by emission count (most emissions first)
        const sortedByEmissions = [...timings].sort((a, b) => b.emitCount - a.emitCount);

        logInfo('  Observable Name'.padEnd(40) + 'Emissions'.padEnd(12) + 'First Emit');
        logInfo('  ' + '─'.repeat(60));

        for (const timing of sortedByEmissions) {
            const firstEmit = timing.timeToFirstEmit ? `${timing.timeToFirstEmit.toFixed(1)}ms` : 'pending';
            logInfo(
                `  ${timing.observableName.padEnd(40)}` +
                `${timing.emitCount.toString().padEnd(12)}` +
                `${firstEmit}`,
            );
        }

        const totalEmissions = timings.reduce((sum, t) => sum + t.emitCount, 0);
        logInfo('  ' + '─'.repeat(60));
        logInfo(`  TOTAL EMISSIONS: ${totalEmissions}`);
        logInfo('═══════════════════════════════════════════════════════');
        logInfo('');
    }

    /**
     * Clear all timing data
     */
    public clear(): void {
        this.timings.clear();
    }

    /**
     * Enable/disable profiling
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if profiling is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Convenience method to conditionally profile an observable
     * Only profiles if __DEV__ is true and profiling is enabled
     */
    public profileIfEnabled<T>(
        observable: Observable<T>,
        name: string,
        componentName: string,
        componentId: string,
    ): Observable<T> {
        if (__DEV__ && this.enabled) {
            return this.profile(observable, name, componentName, componentId);
        }
        return observable;
    }
}

// Singleton instance
const observableProfiler = new ObservableProfiler();

export default observableProfiler;
