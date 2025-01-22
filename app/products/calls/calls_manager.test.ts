// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Platform} from 'react-native';

import {callsOnAppStateChange} from '@calls/state';

import {CallsManager} from './calls_manager';

jest.mock('@calls/state', () => ({
    callsOnAppStateChange: jest.fn(),
}));

describe('CallsManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(AppState, 'addEventListener');
    });

    afterEach(() => {
        // Reset platform to its original value
        Platform.OS = 'ios';
    });

    it('initializes AppState listeners correctly for iOS', () => {
        Platform.OS = 'ios';
        CallsManager.initialize();

        expect(AppState.addEventListener).toHaveBeenCalledWith('change', callsOnAppStateChange);
        expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('initializes AppState listeners correctly for Android', () => {
        Platform.OS = 'android';
        CallsManager.initialize();

        expect(AppState.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
        expect(AppState.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
        expect(AppState.addEventListener).toHaveBeenCalledTimes(2);

        // Test that the blur callback calls callsOnAppStateChange with 'inactive'
        const blurCallback = jest.mocked(AppState.addEventListener).mock.calls[0][1];
        blurCallback('inactive');
        expect(callsOnAppStateChange).toHaveBeenCalledWith('inactive');

        // Test that the focus callback calls callsOnAppStateChange with 'active'
        const focusCallback = jest.mocked(AppState.addEventListener).mock.calls[1][1];
        focusCallback('active');
        expect(callsOnAppStateChange).toHaveBeenCalledWith('active');
    });
});
