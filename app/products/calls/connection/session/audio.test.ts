// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import CallsNative, {type AudioRoute} from '@mattermost/calls-native';

import {setPreferredAudioRoute} from '@calls/actions/calls';

import {createAudioRouteManager, startAudioSession} from './audio';

jest.mock('@calls/actions/calls', () => ({
    setPreferredAudioRoute: jest.fn(),
}));

describe('audio session', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should wrap a native failure to start the audio session in a descriptive error', async () => {
        (CallsNative.startAudioSession as jest.Mock).mockRejectedValueOnce(new Error('no session'));

        await expect(startAudioSession()).rejects.toThrow('calls: failed to start audio session: no session');
    });
});

describe('createAudioRouteManager', () => {
    // Start the manager and return it alongside the onAudioRouteChanged listener it registered.
    const startAndGetRouteListener = async (initialRoute?: Partial<AudioRoute>) => {
        (CallsNative.getAudioRoute as jest.Mock).mockResolvedValueOnce({
            selectedAudioDevice: 'EARPIECE',
            availableAudioDeviceList: ['EARPIECE', 'SPEAKER_PHONE'],
            ...initialRoute,
        });

        const manager = createAudioRouteManager();
        await manager.start();

        const calls = (CallsNative.onAudioRouteChanged as jest.Mock).mock.calls;
        const listener = calls[calls.length - 1][0] as (route: AudioRoute) => void;
        return {manager, listener};
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should select Bluetooth over WiredHeadset and Earpiece (highest priority)', async () => {
        const {listener} = await startAndGetRouteListener();
        jest.clearAllMocks();

        listener({
            selectedAudioDevice: 'EARPIECE',
            availableAudioDeviceList: ['SPEAKER_PHONE', 'EARPIECE', 'WIRED_HEADSET', 'BLUETOOTH'],
        });

        expect(setPreferredAudioRoute).toHaveBeenCalledWith('BLUETOOTH');
    });

    it('should select WiredHeadset over Earpiece when Bluetooth is not available', async () => {
        const {listener} = await startAndGetRouteListener();
        jest.clearAllMocks();

        listener({
            selectedAudioDevice: 'EARPIECE',
            availableAudioDeviceList: ['SPEAKER_PHONE', 'EARPIECE', 'WIRED_HEADSET'],
        });

        expect(setPreferredAudioRoute).toHaveBeenCalledWith('WIRED_HEADSET');
    });

    it('should use the initial route from getAudioRoute on start', async () => {
        await startAndGetRouteListener({
            selectedAudioDevice: 'BLUETOOTH',
            availableAudioDeviceList: ['BLUETOOTH', 'EARPIECE', 'SPEAKER_PHONE'],
        });

        expect(CallsNative.getAudioRoute).toHaveBeenCalled();
        expect(setPreferredAudioRoute).toHaveBeenCalledWith('BLUETOOTH');
    });

    it('should not re-route when the user-pinned device is still available', async () => {
        const {manager, listener} = await startAndGetRouteListener();

        manager.setUserSelectedAudioRoute('SPEAKER_PHONE');
        jest.clearAllMocks();

        listener({
            selectedAudioDevice: 'SPEAKER_PHONE',
            availableAudioDeviceList: ['EARPIECE', 'SPEAKER_PHONE'],
        });

        expect(setPreferredAudioRoute).not.toHaveBeenCalled();
    });

    it('should clear the user pin and auto-route when the pinned device disconnects', async () => {
        const {manager, listener} = await startAndGetRouteListener();

        manager.setUserSelectedAudioRoute('BLUETOOTH');
        jest.clearAllMocks();

        listener({
            selectedAudioDevice: 'EARPIECE',
            availableAudioDeviceList: ['EARPIECE', 'SPEAKER_PHONE'],
        });

        expect(setPreferredAudioRoute).toHaveBeenCalledWith('EARPIECE');
    });

    it('should remove the route listener on stop', async () => {
        const remove = jest.fn();
        (CallsNative.onAudioRouteChanged as jest.Mock).mockReturnValueOnce({remove});

        const {manager} = await startAndGetRouteListener();
        manager.stop();

        expect(remove).toHaveBeenCalled();
    });
});
