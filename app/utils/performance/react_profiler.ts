// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * React Profiler for Post List Performance
 *
 * Tracks component render timing to identify bottlenecks in the post list.
 * Uses React's built-in Profiler API to measure:
 * - Initial mount time
 * - Update/re-render time
 * - Which components are slowest
 */

import {logInfo} from '@utils/log';

export interface ProfilerMetrics {
    componentName: string;
    phase: 'mount' | 'update' | 'nested-update';
    actualDuration: number; // Time spent rendering this component and descendants
    baseDuration: number; // Estimated time to render without memoization
    startTime: number;
    commitTime: number;
}

class ReactProfilerManager {
    private metrics: Map<string, ProfilerMetrics[]> = new Map();
    private enabled = __DEV__;

    /**
     * Callback for React Profiler onRender
     */
    public onRender(
        id: string,
        phase: 'mount' | 'update' | 'nested-update',
        actualDuration: number,
        baseDuration: number,
        startTime: number,
        commitTime: number,
    ): void {
        if (!this.enabled) {
            return;
        }

        const metric: ProfilerMetrics = {
            componentName: id,
            phase,
            actualDuration,
            baseDuration,
            startTime,
            commitTime,
        };

        const existingMetrics = this.metrics.get(id) || [];
        existingMetrics.push(metric);
        this.metrics.set(id, existingMetrics);

        // Log significant renders (>50ms)
        if (actualDuration > 50) {
            logInfo(`[ReactProfiler] ${id} ${phase}: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
        }
    }

    /**
     * Get all metrics for a specific component
     */
    public getMetrics(componentId: string): ProfilerMetrics[] {
        return this.metrics.get(componentId) || [];
    }

    /**
     * Get all collected metrics
     */
    public getAllMetrics(): Map<string, ProfilerMetrics[]> {
        return this.metrics;
    }

    /**
     * Print summary report of all profiled components
     */
    public printSummary(): void {
        if (this.metrics.size === 0) {
            logInfo('[ReactProfiler] No metrics collected');
            return;
        }

        logInfo('');
        logInfo('═══════════════════════════════════════════════════════');
        logInfo('  REACT PROFILER REPORT');
        logInfo('═══════════════════════════════════════════════════════');

        // Sort components by total time spent
        const componentSummaries = Array.from(this.metrics.entries()).map(([id, metrics]) => {
            const totalActual = metrics.reduce((sum, m) => sum + m.actualDuration, 0);
            const totalBase = metrics.reduce((sum, m) => sum + m.baseDuration, 0);
            const mountCount = metrics.filter((m) => m.phase === 'mount').length;
            const updateCount = metrics.filter((m) => m.phase === 'update').length;
            const avgActual = totalActual / metrics.length;

            return {
                id,
                totalActual,
                totalBase,
                mountCount,
                updateCount,
                avgActual,
                renderCount: metrics.length,
            };
        }).sort((a, b) => b.totalActual - a.totalActual);

        // Print top slowest components
        logInfo('  TOP SLOWEST COMPONENTS:');
        logInfo('───────────────────────────────────────────────────────');
        componentSummaries.slice(0, 10).forEach((summary, idx) => {
            logInfo(`  ${idx + 1}. ${summary.id}`);
            logInfo(`     Total Time:    ${summary.totalActual.toFixed(2)}ms`);
            logInfo(`     Avg per Render: ${summary.avgActual.toFixed(2)}ms`);
            logInfo(`     Renders:       ${summary.renderCount} (${summary.mountCount} mount, ${summary.updateCount} update)`);
            logInfo(`     Base Duration: ${summary.totalBase.toFixed(2)}ms`);

            if (summary.totalActual > summary.totalBase * 1.5) {
                logInfo(`     ⚠️  Memoization opportunity: ${(((summary.totalActual / summary.totalBase) - 1) * 100).toFixed(0)}% slower than optimized`);
            }
        });

        // Total time across all components
        const totalTime = componentSummaries.reduce((sum, s) => sum + s.totalActual, 0);
        logInfo('───────────────────────────────────────────────────────');
        logInfo(`  TOTAL PROFILED TIME: ${totalTime.toFixed(2)}ms`);
        logInfo('═══════════════════════════════════════════════════════');
        logInfo('');
    }

    /**
     * Clear all collected metrics
     */
    public clearMetrics(componentId?: string): void {
        if (componentId) {
            this.metrics.delete(componentId);
        } else {
            this.metrics.clear();
        }
    }

    /**
     * Enable/disable profiler
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }
}

// Singleton instance
const ReactProfiler = new ReactProfilerManager();

export default ReactProfiler;
