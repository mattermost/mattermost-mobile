// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Type definitions for react-native-incall-manager 3.2
// Project: https://github.com/zxcpoiu/react-native-incall-manager#readme
// Definitions by: Carlos Quiroga <https://github.com/KarlosQ>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.8

declare module 'react-native-incall-manager' {
    export interface StartSetup {
        media?: string | undefined;
        auto?: boolean | undefined;
        ringback?: string | undefined;
    }

    export interface StopSetup {
        busytone?: string | undefined;
    }

    export class InCallManager {
        start(setup?: StartSetup): void;

        stop(setup?: StopSetup): void;

        turnScreenOff(): void;

        turnScreenOn(): void;

        getIsWiredHeadsetPluggedIn(): Promise<any>;

        setFlashOn(enable?: boolean, brightness?: number): number;

        setKeepScreenOn(enable?: boolean): void;

        setSpeakerphoneOn(enable?: boolean): void;

        setForceSpeakerphoneOn(_flag?: boolean): void;

        setMicrophoneMute(enable?: boolean): void;

        startRingtone(
            ringtone?: string,
            vibrate_pattern?: any[],
            ios_category?: string,
            seconds?: number
        ): void;

        stopRingtone(): void;

        startProximitySensor(): void;

        stopProximitySensor(): void;

        startRingback(ringback?: string): void;

        stopRingback(): void;

        pokeScreen(_timeout?: number): void;

        getAudioUri(audioType: string, fileType: string): any;

        chooseAudioRoute(route: any): Promise<any>;

        requestAudioFocus(): void;

        abandonAudioFocus(): void;
    }

    declare const _default: InCallManager;

    export default _default;
}
