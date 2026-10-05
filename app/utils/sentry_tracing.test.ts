// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Config from '@assets/config.json';

const mockStartSpan = jest.fn((_options: unknown, callback: () => unknown) => callback());
const mockStartInactiveSpan = jest.fn((options: unknown) => ({
    end: jest.fn(),
    setAttribute: jest.fn(),
    options,
}));
const mockGetActiveSpan = jest.fn();
const mockInit = jest.fn();
const mockWrap = jest.fn((component: unknown) => component);
const mockRegisterNavigationContainer = jest.fn();
const mockReactNavigationIntegration = jest.fn(() => ({
    name: 'ReactNavigation',
    registerNavigationContainer: mockRegisterNavigationContainer,
}));
const mockHermesProfilingIntegration = jest.fn(() => ({name: 'HermesProfiling'}));

jest.mock('@sentry/react-native', () => ({
    init: mockInit,
    wrap: mockWrap,
    startSpan: mockStartSpan,
    startInactiveSpan: mockStartInactiveSpan,
    getActiveSpan: mockGetActiveSpan,
    reactNavigationIntegration: mockReactNavigationIntegration,
    hermesProfilingIntegration: mockHermesProfilingIntegration,
}));

jest.mock('@assets/config.json', () => ({
    SentryEnabled: true,
}));

describe('sentry_tracing', () => {
    let tracing: typeof import('./sentry_tracing');

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        Config.SentryEnabled = true;
        tracing = require('./sentry_tracing');
        tracing.testExports.resetForTesting();
    });

    it('should initialize Sentry with navigation and profiling integrations', () => {
        const beforeSend = jest.fn();
        const result = tracing.initializeSentryTracing({
            dsn: 'https://example.ingest.sentry.io/1',
            environment: 'beta',
            tracesSampleRate: 1,
            sampleRate: 1,
            profilesSampleRate: 1,
            attachStacktrace: true,
            sentryOptions: {debug: false},
            beforeSend,
        });

        expect(result).toBe(true);
        expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
            dsn: 'https://example.ingest.sentry.io/1',
            sendDefaultPii: false,
            tracesSampleRate: 1,
            profilesSampleRate: 1,
            integrations: expect.any(Array),
            beforeSend,
        }));
        expect(mockReactNavigationIntegration).toHaveBeenCalled();
        expect(mockHermesProfilingIntegration).toHaveBeenCalled();
    });

    it('should no-op helpers when Sentry is disabled', async () => {
        Config.SentryEnabled = false;

        const value = await tracing.withSpan('name', 'op', async () => 'ok');
        expect(value).toBe('ok');
        expect(mockStartSpan).not.toHaveBeenCalled();

        const handle = tracing.startManualTransaction('key', 'name', 'op');
        handle.end();
        expect(mockStartInactiveSpan).not.toHaveBeenCalled();
    });

    it('should end manual transactions by key', () => {
        tracing.testExports.setInitializedForTesting(true);

        const handle = tracing.startManualTransaction('mobile_channel_switch', 'mobile_channel_switch', 'ui.action');
        expect(mockStartInactiveSpan).toHaveBeenCalledWith(expect.objectContaining({
            name: 'mobile_channel_switch',
            op: 'ui.action',
            forceTransaction: true,
        }));
        expect(tracing.testExports.activeManualSpans.has('mobile_channel_switch')).toBe(true);

        handle.end();
        expect(tracing.testExports.activeManualSpans.has('mobile_channel_switch')).toBe(false);
    });

    it('should skip high-volume websocket events', () => {
        expect(tracing.shouldTraceWebsocketEvent('typing')).toBe(false);
        expect(tracing.shouldTraceWebsocketEvent('posted')).toBe(true);
    });

    it('should create child spans with onlyIfParent by default', async () => {
        tracing.testExports.setInitializedForTesting(true);

        await tracing.withSpan('db.batch.handlePosts', 'db', async () => undefined, {
            attributes: {'mm.db.record_count': 3},
        });

        expect(mockStartSpan).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'db.batch.handlePosts',
                op: 'db',
                onlyIfParent: true,
                attributes: {'mm.db.record_count': 3},
            }),
            expect.any(Function),
        );
    });

    it('should attach child spans to the open manual transaction when no span is active', async () => {
        tracing.testExports.setInitializedForTesting(true);
        const handle = tracing.startManualTransaction('mobile_channel_switch', 'mobile_channel_switch', 'ui.action');
        const transaction = tracing.testExports.activeManualSpans.get('mobile_channel_switch');

        await tracing.withSpan('GET /api/v4/channels', 'http.client', async () => undefined);

        expect(mockStartSpan).toHaveBeenLastCalledWith(
            expect.objectContaining({
                parentSpan: transaction,
                onlyIfParent: true,
                attributes: {'mm.attribution': 'fallback'},
            }),
            expect.any(Function),
        );

        handle.end();
        await tracing.withSpan('GET /api/v4/channels', 'http.client', async () => undefined);

        expect(mockStartSpan).toHaveBeenLastCalledWith(
            expect.objectContaining({parentSpan: undefined, onlyIfParent: true, attributes: {}}),
            expect.any(Function),
        );
    });

    it('should prefer the active span over an open manual transaction', async () => {
        tracing.testExports.setInitializedForTesting(true);
        tracing.startManualTransaction('mobile_channel_switch', 'mobile_channel_switch', 'ui.action');
        mockGetActiveSpan.mockReturnValueOnce({});

        tracing.withSpanSync('ws.posted', 'ws.handle', () => undefined);

        expect(mockStartSpan).toHaveBeenCalledWith(
            expect.objectContaining({parentSpan: undefined, attributes: {}}),
            expect.any(Function),
        );
    });

    it('should start a transaction when forceTransaction is set', async () => {
        tracing.testExports.setInitializedForTesting(true);

        await tracing.withSpan('app.initialize', 'app.init', async () => undefined, {forceTransaction: true});

        expect(mockStartSpan).toHaveBeenCalledWith(
            {name: 'app.initialize', op: 'app.init', forceTransaction: true, attributes: {}},
            expect.any(Function),
        );
    });
});
