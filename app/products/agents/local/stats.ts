// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {getLoadedLocalAgentBackend} from './engine';

import type {LiteRTLMInstance} from 'react-native-litert-lm';

// Stats are counts and timings only; never log prompt, message or tool result text (logs are user-exportable).

export type StepTiming = {
    startedAt: number;
    firstOutputAt?: number;
    endedAt: number;
};

function toMb(bytes: number): number {
    return Math.round(bytes / (1024 * 1024));
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

export function logStepStats(llm: LiteRTLMInstance, step: string, timing: StepTiming) {
    try {
        const stats = llm.getStats();
        const forecast = llm.getMemoryForecast();
        const usage = llm.getMemoryUsage();
        const outputTokens = Math.round(stats.completionTokens);
        const contextTokens = forecast?.contextTokensUsed;

        logDebug('LocalAgent.stats: step', {
            step,
            backend: getLoadedLocalAgentBackend(),

            // Time until the first streamed output; dominated by prefill of the prompt.
            timeToFirstOutputMs: timing.firstOutputAt ? timing.firstOutputAt - timing.startedAt : undefined,
            totalMs: timing.endedAt - timing.startedAt,
            promptTokens: contextTokens === undefined ? undefined : Math.max(contextTokens - outputTokens, 0),
            outputTokens,
            decodeTokensPerSec: round1(stats.tokensPerSecond),
            contextTokens,
            maxContextTokens: forecast?.maxContextTokens,
            residentMb: toMb(usage.residentBytes),
            availableMb: toMb(usage.availableMemoryBytes),
        });
    } catch (error) {
        logDebug('LocalAgent.stats: step stats unavailable', getFullErrorMessage(error));
    }
}

export function logToolStats(tool: string, durationMs: number, answerChars: number) {
    logDebug('LocalAgent.stats: tool', {tool, durationMs, answerChars});
}

export function startTurnStats(llm: LiteRTLMInstance): number {
    llm.memoryTracker?.reset();
    return Date.now();
}

type TurnSummary = {
    startedAt: number;
    toolNames: string[];
    answeredInToolStep: boolean;
};

export function logTurnStats(llm: LiteRTLMInstance, {startedAt, toolNames, answeredInToolStep}: TurnSummary) {
    try {
        const summary = llm.memoryTracker?.getSummary();
        const usage = llm.getMemoryUsage();

        logDebug('LocalAgent.stats: turn', {
            backend: getLoadedLocalAgentBackend(),
            totalMs: Date.now() - startedAt,
            toolCalls: toolNames.length,
            tools: toolNames,
            answeredInToolStep,

            // Sampled after each generation, so it can miss short spikes mid-prefill.
            peakResidentMb: summary ? toMb(summary.peakResidentBytes) : undefined,
            residentMb: toMb(usage.residentBytes),
            availableMb: toMb(usage.availableMemoryBytes),
        });
    } catch (error) {
        logDebug('LocalAgent.stats: turn stats unavailable', getFullErrorMessage(error));
    }
}
