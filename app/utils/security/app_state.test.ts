// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type AppStateStatus} from 'react-native';

import {handleAppStateResume, type ResumeGateState, type ResumeGateStrategy} from './app_state';
import {AuthenticationSource, PROMPT_AUTH_AFTER} from './constants';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
}));

const buildStrategy = (overrides: Partial<ResumeGateStrategy> = {}): ResumeGateStrategy => ({
    isEnabled: () => true,
    isGateOpen: () => false,
    authenticate: jest.fn().mockResolvedValue(true),
    promptWhenNotExpired: false,
    source: AuthenticationSource.SecurityManager,
    ...overrides,
});

const resume = (state: ResumeGateState, strategy: ResumeGateStrategy) => {
    return handleAppStateResume('active' as AppStateStatus, state, strategy);
};

describe('handleAppStateResume', () => {
    test('should record when the app went to the background', async () => {
        const state: ResumeGateState = {backgroundSince: 0, previousAppState: 'active'};

        await handleAppStateResume('background' as AppStateStatus, state, buildStrategy());

        expect(state.backgroundSince).toBeGreaterThan(0);
        expect(state.previousAppState).toBe('background');
    });

    test('should preserve backgroundSince when a gate is already open', async () => {
        const backgroundSince = Date.now() - PROMPT_AUTH_AFTER - 1000;
        const state: ResumeGateState = {backgroundSince, previousAppState: 'background'};
        const strategy = buildStrategy({isGateOpen: () => true});

        await resume(state, strategy);

        // Clearing it here would let the next resume compute authExpired === false.
        expect(state.backgroundSince).toBe(backgroundSince);
        expect(strategy.authenticate).not.toHaveBeenCalled();
    });

    test('should clear backgroundSince without prompting when the window has not elapsed', async () => {
        const state: ResumeGateState = {backgroundSince: Date.now() - 1000, previousAppState: 'background'};
        const strategy = buildStrategy();

        await resume(state, strategy);

        expect(state.backgroundSince).toBe(0);
        expect(strategy.authenticate).not.toHaveBeenCalled();
    });

    test('should authenticate and clear backgroundSince when the window has elapsed', async () => {
        const state: ResumeGateState = {backgroundSince: Date.now() - PROMPT_AUTH_AFTER - 1000, previousAppState: 'background'};
        const strategy = buildStrategy();

        await resume(state, strategy);

        expect(strategy.authenticate).toHaveBeenCalledWith(true);
        expect(state.backgroundSince).toBe(0);
    });

    test('should keep backgroundSince when authentication does not succeed', async () => {
        const backgroundSince = Date.now() - PROMPT_AUTH_AFTER - 1000;
        const state: ResumeGateState = {backgroundSince, previousAppState: 'background'};
        const strategy = buildStrategy({authenticate: jest.fn().mockResolvedValue(false)});

        await resume(state, strategy);

        expect(state.backgroundSince).toBe(backgroundSince);
    });

    test('should not authenticate when blocked, and keep the window', async () => {
        const backgroundSince = Date.now() - PROMPT_AUTH_AFTER - 1000;
        const state: ResumeGateState = {backgroundSince, previousAppState: 'background'};
        const strategy = buildStrategy({shouldBlock: jest.fn().mockResolvedValue(true)});

        await resume(state, strategy);

        expect(strategy.authenticate).not.toHaveBeenCalled();
        expect(state.backgroundSince).toBe(backgroundSince);
    });

    test('should run the gate on a non-expired resume when promptWhenNotExpired is set', async () => {
        const state: ResumeGateState = {backgroundSince: Date.now() - 1000, previousAppState: 'background'};
        const strategy = buildStrategy({promptWhenNotExpired: true});

        await resume(state, strategy);

        expect(strategy.authenticate).toHaveBeenCalledWith(false);
    });

    test('should do nothing when disabled', async () => {
        const backgroundSince = Date.now() - PROMPT_AUTH_AFTER - 1000;
        const state: ResumeGateState = {backgroundSince, previousAppState: 'background'};
        const strategy = buildStrategy({isEnabled: () => false});

        await resume(state, strategy);

        expect(strategy.authenticate).not.toHaveBeenCalled();
        expect(state.backgroundSince).toBe(backgroundSince);
        expect(state.previousAppState).toBe('active');
    });

    test('should authenticate across the background -> inactive -> active sequence iOS emits', async () => {
        const state: ResumeGateState = {backgroundSince: 0, previousAppState: 'active'};
        const strategy = buildStrategy();

        await handleAppStateResume('background' as AppStateStatus, state, strategy);
        state.backgroundSince = Date.now() - PROMPT_AUTH_AFTER - 1000;
        await handleAppStateResume('inactive' as AppStateStatus, state, strategy);
        await resume(state, strategy);

        expect(strategy.authenticate).toHaveBeenCalledWith(true);
        expect(state.backgroundSince).toBe(0);
    });

    test('should not treat a transient inactive as a resume', async () => {
        const state: ResumeGateState = {backgroundSince: 0, previousAppState: 'active'};
        const strategy = buildStrategy();

        await handleAppStateResume('inactive' as AppStateStatus, state, strategy);
        await resume(state, strategy);

        expect(strategy.authenticate).not.toHaveBeenCalled();
    });

    test('should ignore a resume that did not come from the background', async () => {
        const state: ResumeGateState = {backgroundSince: 0, previousAppState: 'inactive'};
        const strategy = buildStrategy();

        await resume(state, strategy);

        expect(strategy.authenticate).not.toHaveBeenCalled();
    });
});
