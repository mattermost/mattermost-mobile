// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';

import SnackBarStore from './snackbar_store';

import type {ShowSnackBarArgs} from '@utils/snack_bar';

describe('SnackBarStore', () => {
    afterEach(() => {
        SnackBarStore.dismiss();
    });

    it('should have initial state with visible false and null config', () => {
        const state = SnackBarStore.getState();

        expect(state.visible).toBe(false);
        expect(state.config).toBeNull();
    });

    it('should show snackbar with config', () => {
        const config: ShowSnackBarArgs = {
            barType: 'INFO_COPIED',
            sourceScreen: Screens.HOME,
        };

        SnackBarStore.show(config);

        const state = SnackBarStore.getState();
        expect(state.visible).toBe(true);
        expect(state.config).toBe(config);
    });

    it('should show snackbar with action callback', () => {
        const onAction = jest.fn();
        const config: ShowSnackBarArgs = {
            barType: 'MUTE_CHANNEL',
            onAction,
        };

        SnackBarStore.show(config);

        const state = SnackBarStore.getState();
        expect(state.visible).toBe(true);
        expect(state.config).toBe(config);
        expect(state.config?.onAction).toBe(onAction);
    });

    it('should show snackbar with custom message', () => {
        const config: ShowSnackBarArgs = {
            barType: 'LINK_COPIED',
            customMessage: 'Custom success message',
        };

        SnackBarStore.show(config);

        const state = SnackBarStore.getState();
        expect(state.visible).toBe(true);
        expect(state.config?.customMessage).toBe('Custom success message');
    });

    it('should dismiss snackbar', () => {
        const config: ShowSnackBarArgs = {
            barType: 'FOLLOW_THREAD',
        };

        SnackBarStore.show(config);
        expect(SnackBarStore.getState().visible).toBe(true);

        SnackBarStore.dismiss();

        const state = SnackBarStore.getState();
        expect(state.visible).toBe(false);
        expect(state.config).toBeNull();
    });

    it('should replace existing snackbar with new one', () => {
        const firstConfig: ShowSnackBarArgs = {
            barType: 'AGENT_TOOL_APPROVAL_ERROR',
        };

        const secondConfig: ShowSnackBarArgs = {
            barType: 'AGENT_STOP_ERROR',
        };

        SnackBarStore.show(firstConfig);
        expect(SnackBarStore.getState().config).toBe(firstConfig);

        SnackBarStore.show(secondConfig);
        const state = SnackBarStore.getState();
        expect(state.visible).toBe(true);
        expect(state.config).toBe(secondConfig);
    });

    it('should emit values through observable', () => {
        const mockCallback = jest.fn();
        const subscription = SnackBarStore.observe().subscribe(mockCallback);

        // Should immediately get current state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
            config: null,
        });

        const config: ShowSnackBarArgs = {
            barType: 'MUTE_CHANNEL',
        };

        SnackBarStore.show(config);

        // Should get new state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: true,
            config,
        });

        SnackBarStore.dismiss();

        // Should get dismissed state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
            config: null,
        });

        expect(mockCallback).toHaveBeenCalledTimes(3);

        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        SnackBarStore.show(config);
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });
});
