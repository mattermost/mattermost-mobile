// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Post List Performance Tracking
 *
 * Dedicated performance monitoring for post list optimization project.
 * Tracks detailed metrics for baseline and optimization comparison.
 */

import {Platform} from 'react-native';
import performance from 'react-native-performance';

import LocalConfig from '@assets/config.json';
import {logInfo} from '@utils/log';

export interface PostListMetrics {

    // Initial render metrics
    initialRenderStart: number;
    initialRenderEnd?: number;
    initialRenderDuration?: number;
    postCount: number; // Total posts in channel/thread
    initiallyRenderedCount?: number; // Posts actually rendered initially (FlatList initialNumToRender)
    initiallyViewableCount?: number; // Posts visible in viewport initially

    // Markdown parsing
    markdownParseCount: number;
    markdownParseTotalMs: number;
    markdownParseAvgMs?: number;

    // Metadata
    channelId: string;
    threadId?: string;
    architecture: 'old' | 'new';
    platform: 'ios' | 'android';
    timestamp: number;
}

class PostListPerformanceTracker {
    private metrics: Map<string, PostListMetrics> = new Map();
    private markdownParseTimes: number[] = [];
    private enabled: boolean = LocalConfig.EnablePostListPerformance && __DEV__;

    constructor() {
        // Detect architecture
        const arch = this.getArchitecture();
        logInfo(`PostListPerformanceTracker initialized (${arch} architecture, ${Platform.OS})`);
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Start tracking initial render for a channel/thread
     */
    public startInitialRender(channelId: string, threadId: string | undefined, postCount: number): void {
        if (!this.enabled) {
            return;
        }

        const key = this.getKey(channelId, threadId);

        // Check if metrics already exist (created early by trackPreparePostList)
        const existingMetrics = this.metrics.get(key);
        if (existingMetrics) {
            // Metrics already created, just log
            logInfo(`[PostListPerf] Initial render started (already tracking): ${key} (${postCount} posts)`);
            return;
        }

        const metrics: PostListMetrics = {
            initialRenderStart: performance.now(),
            postCount,
            markdownParseCount: 0,
            markdownParseTotalMs: 0,
            channelId,
            threadId,
            architecture: this.getArchitecture(),
            platform: Platform.OS as 'ios' | 'android',
            timestamp: Date.now(),
        };

        this.metrics.set(key, metrics);
        logInfo(`[PostListPerf] Initial render started: ${key} (${postCount} posts)`);
    }

    /**
     * End initial render tracking
     */
    public endInitialRender(
        channelId: string,
        threadId: string | undefined,
        renderedCount?: number,
        viewableCount?: number,
    ): void {
        if (!this.enabled) {
            return;
        }

        const key = this.getKey(channelId, threadId);
        const metrics = this.metrics.get(key);

        if (!metrics || metrics.initialRenderEnd) {
            return;
        }

        metrics.initialRenderEnd = performance.now();
        metrics.initialRenderDuration = metrics.initialRenderEnd - metrics.initialRenderStart;
        metrics.initiallyRenderedCount = renderedCount;
        metrics.initiallyViewableCount = viewableCount;

        logInfo(`[PostListPerf] Initial render completed: ${key} in ${metrics.initialRenderDuration.toFixed(2)}ms`);
        logInfo(`  Total: ${metrics.postCount} posts | Rendered: ${renderedCount || '?'} | Viewable: ${viewableCount || '?'}`);
    }

    /**
     * Track individual markdown parse
     */
    public trackMarkdownParse(channelId: string, threadId: string | undefined, postId: string, messageLength: number, durationMs: number): void {
        if (!this.enabled) {
            return;
        }

        const key = this.getKey(channelId, threadId);
        const metrics = this.metrics.get(key);

        if (!metrics) {
            return;
        }

        metrics.markdownParseCount++;
        metrics.markdownParseTotalMs += durationMs;
        metrics.markdownParseAvgMs = metrics.markdownParseTotalMs / metrics.markdownParseCount;

        this.markdownParseTimes.push(durationMs);

        logInfo(`[PostListPerf] Markdown parse for post ${postId.substring(0, 8)}: ${messageLength} chars in ${durationMs.toFixed(2)}ms`);
    }

    /**
     * Print summary report
     */
    public printSummary(channelId: string, threadId?: string): void {
        if (!this.enabled) {
            return;
        }

        const key = this.getKey(channelId, threadId);
        const metrics = this.metrics.get(key);

        if (!metrics) {
            logInfo('[PostListPerf] No metrics available');
            return;
        }

        logInfo('');
        logInfo('═══════════════════════════════════════════════════════');
        logInfo('  POST LIST PERFORMANCE REPORT');
        logInfo('═══════════════════════════════════════════════════════');
        logInfo(`  Channel/Thread: ${key}`);
        logInfo(`  Architecture:   ${metrics.architecture}`);
        logInfo(`  Platform:       ${metrics.platform}`);
        logInfo(`  Post Count:     ${metrics.postCount}`);
        logInfo('───────────────────────────────────────────────────────');
        logInfo('  INITIAL RENDER');
        logInfo(`    Duration:      ${metrics.initialRenderDuration?.toFixed(2) || 'N/A'}ms`);
        logInfo(`    TTI:           ${metrics.initialRenderDuration ? (metrics.initialRenderDuration / 1000).toFixed(3) : 'N/A'}s`);
        logInfo(`    Total Posts:   ${metrics.postCount}`);
        logInfo(`    Rendered:      ${metrics.initiallyRenderedCount || 'N/A'}`);
        logInfo(`    Viewable:      ${metrics.initiallyViewableCount || 'N/A'}`);
        logInfo('───────────────────────────────────────────────────────');
        logInfo('  MARKDOWN PARSING');
        logInfo(`    Parse Count:  ${metrics.markdownParseCount}`);
        logInfo(`    Total Time:   ${metrics.markdownParseTotalMs.toFixed(2)}ms`);
        logInfo(`    Avg per Post: ${metrics.markdownParseAvgMs?.toFixed(2) || 'N/A'}ms`);

        if (this.markdownParseTimes.length > 0) {
            const sorted = [...this.markdownParseTimes].sort((a, b) => a - b);
            const p50 = sorted[Math.floor(sorted.length * 0.5)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)];
            const p99 = sorted[Math.floor(sorted.length * 0.99)];
            logInfo(`    P50:          ${p50.toFixed(2)}ms`);
            logInfo(`    P95:          ${p95.toFixed(2)}ms`);
            logInfo(`    P99:          ${p99.toFixed(2)}ms`);
        }

        logInfo('═══════════════════════════════════════════════════════');
        logInfo('');
    }

    /**
     * Clear metrics for a specific channel/thread
     */
    public clearMetrics(channelId: string, threadId?: string): void {
        const key = this.getKey(channelId, threadId);
        this.metrics.delete(key);
        this.markdownParseTimes = [];
    }

    private getKey(channelId: string, threadId?: string): string {
        if (!this.enabled) {
            return '';
        }
        return threadId ? `${channelId}:${threadId}` : channelId;
    }

    private getArchitecture(): 'old' | 'new' {
        // Check if New Architecture is enabled
        // In React Native 0.76+, we can check for TurboModules
        try {
            const TurboModuleRegistry = require('react-native/Libraries/TurboModule/TurboModuleRegistry');
            return TurboModuleRegistry ? 'new' : 'old';
        } catch {
            return 'old';
        }
    }
}

// Singleton instance
const PostListPerformance = new PostListPerformanceTracker();

export default PostListPerformance;
