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
        audioRouteEvent?.remove();

        // Kept local so the post-await check can tell if stop() or a newer start() replaced it.
        const subscription = CallsNative.onAudioRouteChanged((route) => {
            setAudioDeviceInfo(route);
            logDebug('calls: AudioRouteChanged, info:', route);

            const available = route.availableAudioDeviceList;

            // A pinned device that disappears (e.g. a dead BT headset) hands control back to auto-routing.
            const selectedRouteDisconnected = Boolean(userSelectedRoute && !available.includes(userSelectedRoute));
            if (selectedRouteDisconnected) {
                userSelectedRoute = null;
            }

            const isNewDevice = (d: AudioDeviceType) => !previousAvailableDevices.includes(d);
            const newDeviceAppeared = available.some(isNewDevice);
            previousAvailableDevices = available;

            // A lost pin or a new device can leave the current route off the priority order.
            if (!userSelectedRoute && (selectedRouteDisconnected || newDeviceAppeared)) {
                setPreferredAudioRoute(getAutoRoute(available));
            }
        });
        audioRouteEvent = subscription;

        const initialRoute = await CallsNative.getAudioRoute();
        if (audioRouteEvent !== subscription) {
            return;
        }
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
