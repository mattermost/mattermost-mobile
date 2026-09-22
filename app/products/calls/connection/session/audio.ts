// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallsNative from '@mattermost/calls-native';
import {type EmitterSubscription} from 'react-native';

import {setPreferredAudioRoute} from '@calls/actions/calls';
import {setAudioDeviceInfo} from '@calls/state';
import {AudioDevice, type AudioDeviceType} from '@calls/types/calls';
import {getErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const startAudioSession = async () => {
    try {
        await CallsNative.startAudioSession();
    } catch (err) {
        throw new Error(`calls: failed to start audio session: ${getErrorMessage(err)}`);
    }
};

export const stopAudioSession = () => CallsNative.stopAudioSession();

const getAutoRoute = (available: AudioDeviceType[]): AudioDeviceType => {
    if (available.includes(AudioDevice.Bluetooth)) {
        return AudioDevice.Bluetooth;
    }
    if (available.includes(AudioDevice.WiredHeadset)) {
        return AudioDevice.WiredHeadset;
    }
    return AudioDevice.Earpiece;
};

export function createAudioRouteManager() {
    let previousAvailableDevices: AudioDeviceType[] = [];
    let userSelectedRoute: AudioDeviceType | null = null;
    let audioRouteEvent: EmitterSubscription | null = null;

    const setUserSelectedAudioRoute = (route: AudioDeviceType) => {
        userSelectedRoute = route;
    };

    const start = async () => {
        // Listen for audio route changes on both platforms via calls-native.
        audioRouteEvent?.remove();
        audioRouteEvent = CallsNative.onAudioRouteChanged((route) => {
            setAudioDeviceInfo(route);
            logDebug('calls: AudioRouteChanged, info:', route);

            const available = route.availableAudioDeviceList;

            // If the user's pinned device disappeared (e.g. BT headset ran out
            // of battery), clear their intent so auto-routing resumes.
            const selectedRouteDisconnected = Boolean(userSelectedRoute && !available.includes(userSelectedRoute));
            if (selectedRouteDisconnected) {
                userSelectedRoute = null;
            }

            // Re-route when a new device appears OR when the pinned device just
            // disconnected — in both cases the current route may no longer follow
            // the intended priority policy.
            const isNewDevice = (d: AudioDeviceType) => !previousAvailableDevices.includes(d);
            const newDeviceAppeared = available.some(isNewDevice);
            previousAvailableDevices = available;

            if (!userSelectedRoute && (selectedRouteDisconnected || newDeviceAppeared)) {
                setPreferredAudioRoute(getAutoRoute(available));
            }
        });

        // Set initial audio route based on current hardware state.
        const initialRoute = await CallsNative.getAudioRoute();
        setAudioDeviceInfo(initialRoute);
        previousAvailableDevices = initialRoute.availableAudioDeviceList;
        setPreferredAudioRoute(getAutoRoute(initialRoute.availableAudioDeviceList));
    };

    const stop = () => {
        audioRouteEvent?.remove();
        audioRouteEvent = null;
    };

    return {setUserSelectedAudioRoute, start, stop};
}

export type AudioRouteManager = ReturnType<typeof createAudioRouteManager>;
