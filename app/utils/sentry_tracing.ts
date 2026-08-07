// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Config from '@assets/config.json';

import type {Span} from '@sentry/core';
import type {ComponentType} from 'react';

type SpanAttributes = Record<string, string | number | boolean | undefined>;

type ManualSpanHandle = {
    end: () => void;
    setAttribute: (key: string, value: string | number | boolean) => void;
};

const NOOP_HANDLE: ManualSpanHandle = {
    end: () => {
        // no-op when Sentry tracing is disabled
    },
    setAttribute: () => {
        // no-op when Sentry tracing is disabled
    },
};

type NavigationIntegration = {
    registerNavigationContainer: (ref: unknown) => void;
};

let Sentry: typeof import('@sentry/react-native') | undefined;
let navigationIntegration: NavigationIntegration | undefined;
let initialized = false;

const activeManualSpans = new Map<string, Span>();

// High-volume websocket events that would drown useful traces.
const SKIPPED_WS_EVENTS = new Set([
    'typing',
    'stop_typing',
    'status_change',
]);

function ensureSentryModule() {
    if (!Sentry) {
        Sentry = require('@sentry/react-native');
    }
    return Sentry!;
}

export function isSentryTracingEnabled() {
    return Boolean(Config.SentryEnabled);
}

export function getNavigationIntegration() {
    return navigationIntegration;
}

/**
 * Initialize Sentry once with performance integrations.
 * Safe to call multiple times.
 */
export function initializeSentryTracing(initOptions: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    sampleRate: number;
    attachStacktrace: boolean;
    profilesSampleRate: number;
    beforeSend: NonNullable<Parameters<typeof import('@sentry/react-native').init>[0]>['beforeSend'];
    sentryOptions: Record<string, unknown>;
}) {
    if (initialized || !isSentryTracingEnabled()) {
        return initialized;
    }

    const sentry = ensureSentryModule();
    const reactNavigation = sentry.reactNavigationIntegration({
        enableTimeToInitialDisplay: true,
        useDispatchedActionData: true,
    });
    navigationIntegration = reactNavigation;

    sentry.init({
        dsn: initOptions.dsn,
        sendDefaultPii: false,
        environment: initOptions.environment,
        tracesSampleRate: initOptions.tracesSampleRate,
        sampleRate: initOptions.sampleRate,
        profilesSampleRate: initOptions.profilesSampleRate,
        attachStacktrace: initOptions.attachStacktrace,
        enableCaptureFailedRequests: false,
        ...initOptions.sentryOptions,
        integrations: [
            reactNavigation,
            sentry.hermesProfilingIntegration({platformProfilers: true}),
        ],
        beforeSend: initOptions.beforeSend,
    });

    initialized = true;
    return true;
}

export function wrapRootComponent<P extends Record<string, unknown>>(
    RootComponent: ComponentType<P>,
): ComponentType<P> {
    if (!isSentryTracingEnabled()) {
        return RootComponent;
    }

    const sentry = ensureSentryModule();
    return sentry.wrap(RootComponent);
}

export function registerNavigationContainer(ref: unknown) {
    if (!isSentryTracingEnabled() || !navigationIntegration || !ref) {
        return;
    }

    navigationIntegration.registerNavigationContainer(ref);
}

/**
 * Start a long-lived span/transaction that is ended later by key.
 * Used for channel/team switch and first useful screen load.
 */
export function startManualTransaction(
    key: string,
    name: string,
    op: string,
    attributes?: SpanAttributes,
): ManualSpanHandle {
    if (!isSentryTracingEnabled() || !initialized) {
        return NOOP_HANDLE;
    }

    const existing = activeManualSpans.get(key);
    if (existing) {
        existing.end();
        activeManualSpans.delete(key);
    }

    const sentry = ensureSentryModule();
    let spanRef: Span | undefined;

    sentry.startSpanManual(
        {
            name,
            op,
            forceTransaction: true,
            attributes: sanitizeAttributes(attributes),
        },
        (span) => {
            spanRef = span;
            activeManualSpans.set(key, span);
        },
    );

    if (!spanRef) {
        return NOOP_HANDLE;
    }

    return {
        end: () => {
            const span = activeManualSpans.get(key);
            if (!span) {
                return;
            }
            span.end();
            activeManualSpans.delete(key);
        },
        setAttribute: (attrKey, value) => {
            const span = activeManualSpans.get(key);
            span?.setAttribute(attrKey, value);
        },
    };
}

export function endManualTransaction(key: string, attributes?: SpanAttributes) {
    const span = activeManualSpans.get(key);
    if (!span) {
        return;
    }

    if (attributes) {
        const sanitized = sanitizeAttributes(attributes);
        for (const [attrKey, value] of Object.entries(sanitized)) {
            span.setAttribute(attrKey, value);
        }
    }

    span.end();
    activeManualSpans.delete(key);
}

type ChildSpanOptions = {
    attributes?: SpanAttributes;

    /**
     * When true (default), skip creating a span unless a parent transaction/span is active.
     * Keeps HTTP/DB/WS spans attached to UX transactions instead of flooding Sentry.
     */
    onlyIfParent?: boolean;
};

/**
 * Run work inside a child span. By default only records when a parent span is active.
 */
export async function withSpan<T>(
    name: string,
    op: string,
    callback: () => Promise<T> | T,
    options?: ChildSpanOptions,
): Promise<T> {
    if (!isSentryTracingEnabled() || !initialized) {
        return callback();
    }

    const sentry = ensureSentryModule();
    return sentry.startSpan(
        {
            name,
            op,
            onlyIfParent: options?.onlyIfParent ?? true,
            attributes: sanitizeAttributes(options?.attributes),
        },
        () => callback(),
    );
}

/**
 * Synchronous span wrapper for fire-and-forget paths (e.g. WS dispatch).
 */
export function withSpanSync<T>(
    name: string,
    op: string,
    callback: () => T,
    options?: ChildSpanOptions,
): T {
    if (!isSentryTracingEnabled() || !initialized) {
        return callback();
    }

    const sentry = ensureSentryModule();
    return sentry.startSpan(
        {
            name,
            op,
            onlyIfParent: options?.onlyIfParent ?? true,
            attributes: sanitizeAttributes(options?.attributes),
        },
        () => callback(),
    );
}

export function shouldTraceWebsocketEvent(event: string | undefined) {
    if (!event) {
        return false;
    }
    return !SKIPPED_WS_EVENTS.has(event);
}

function sanitizeAttributes(attributes?: SpanAttributes): Record<string, string | number | boolean> {
    if (!attributes) {
        return {};
    }

    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

export const testExports = {
    activeManualSpans,
    SKIPPED_WS_EVENTS,
    resetForTesting: () => {
        activeManualSpans.clear();
        initialized = false;
        navigationIntegration = undefined;
        Sentry = undefined;
    },
    setInitializedForTesting: (value: boolean) => {
        initialized = value;
    },
};
