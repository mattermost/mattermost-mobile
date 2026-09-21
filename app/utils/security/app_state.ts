// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type AppStateStatus} from 'react-native';

import {logDebug} from '@utils/log';

import {PROMPT_AUTH_AFTER, type AuthenticationSource} from './constants';

export type ResumeGateState = {
    backgroundSince: number;
    previousAppState?: AppStateStatus;
};

export type ResumeGateStrategy = {

    /** Must be synchronous: it decides precedence before any await can interleave. */
    isEnabled: () => boolean;

    /** True while a prompt or alert is on screen. */
    isGateOpen: () => boolean;

    /** Blocks authentication without consuming the expiry window (e.g. jailbroken). */
    shouldBlock?: () => Promise<boolean>;

    /** Resolves true only when the user authenticated. */
    authenticate: (authExpired: boolean) => Promise<boolean>;

    /** Run the gate even when the window has not elapsed. */
    promptWhenNotExpired: boolean;

    source: AuthenticationSource;
};

/**
 * Applies the resume/expiry rules to `state`, mutating it in place.
 *
 * `backgroundSince` is cleared only when the user is affirmatively let in, so a blocked or
 * interrupted attempt cannot be bypassed by backgrounding the app again.
 */
export const handleAppStateResume = async (
    appState: AppStateStatus,
    state: ResumeGateState,
    strategy: ResumeGateStrategy,
): Promise<void> => {
    const isActive = appState === 'active';
    const isBackground = appState === 'background';

    if (isBackground) {
        state.backgroundSince = Date.now();
    }

    const isResuming = isActive && state.previousAppState === 'background';

    if (appState !== 'inactive') {
        state.previousAppState = appState;
    }

    if (!isResuming || !strategy.isEnabled()) {
        return;
    }

    // The open gate owns the decision; starting another would stack a second prompt
    // behind the alert already on screen.
    if (strategy.isGateOpen()) {
        logDebug(`${strategy.source}: Resume ignored, authentication already in progress`);
        return;
    }

    const authExpired = state.backgroundSince > 0 && (Date.now() - state.backgroundSince) >= PROMPT_AUTH_AFTER;

    if (authExpired || strategy.promptWhenNotExpired) {
        const blocked = await strategy.shouldBlock?.();
        if (!blocked) {
            const authenticated = await strategy.authenticate(authExpired);
            if (authenticated) {
                state.backgroundSince = 0;
            }
        }
    } else {
        state.backgroundSince = 0;
    }
};
