// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {Post} from '@constants';
import Calls from '@constants/calls';
import {isMinimumServerVersion} from '@utils/helpers';
import {displayUsername} from '@utils/user';

import type {CallParticipant, CallsTheme, ColorHSL, ColorRGB} from '@calls/types/calls';
import type {CallsConfig} from '@mattermost/calls/lib/types';
import type PostModel from '@typings/database/models/servers/post';
import type {IntlShape} from 'react-intl';
import type {RTCIceServer} from 'react-native-webrtc';

export function sortParticipants(locale: string, teammateNameDisplay: string, participants?: Dictionary<CallParticipant>, presenterID?: string): CallParticipant[] {
    if (!participants) {
        return [];
    }

    const users = Object.values(participants);

    return users.sort(sortByName(locale, teammateNameDisplay)).sort(sortByState(presenterID));
}

const sortByName = (locale: string, teammateNameDisplay: string) => {
    return (a: CallParticipant, b: CallParticipant) => {
        const nameA = displayUsername(a.userModel, locale, teammateNameDisplay);
        const nameB = displayUsername(b.userModel, locale, teammateNameDisplay);
        return nameA.localeCompare(nameB);
    };
};

const sortByState = (presenterID?: string) => {
    return (a: CallParticipant, b: CallParticipant) => {
        if (a.id === presenterID) {
            return -1;
        } else if (b.id === presenterID) {
            return 1;
        }

        if (a.raisedHand && !b.raisedHand) {
            return -1;
        } else if (b.raisedHand && !a.raisedHand) {
            return 1;
        } else if (a.raisedHand && b.raisedHand) {
            return a.raisedHand - b.raisedHand;
        }

        if (!a.muted && b.muted) {
            return -1;
        } else if (!b.muted && a.muted) {
            return 1;
        }

        return 0;
    };
};

export function getHandsRaised(participants: Dictionary<CallParticipant>) {
    return Object.values(participants).filter((p) => p.raisedHand);
}

export function getHandsRaisedNames(participants: CallParticipant[], currentUserId: string, locale: string, teammateNameDisplay: string, intl: IntlShape) {
    return participants.sort((a, b) => a.raisedHand - b.raisedHand).map((p) => {
        if (p.id === currentUserId) {
            return intl.formatMessage({id: 'mobile.calls_you_2', defaultMessage: 'You'});
        }
        return displayUsername(p.userModel, locale, teammateNameDisplay);
    });
}

export function isSupportedServerCalls(serverVersion?: string) {
    if (serverVersion) {
        return isMinimumServerVersion(
            serverVersion,
            Calls.RequiredServer.MAJOR_VERSION,
            Calls.RequiredServer.MIN_VERSION,
            Calls.RequiredServer.PATCH_VERSION,
        );
    }

    return false;
}

export function isCallsCustomMessage(post: PostModel | Post): boolean {
    return Boolean(post.type && post.type === Post.POST_TYPES.CUSTOM_CALLS);
}

export function idsAreEqual(a: string[], b: string[]) {
    if (a.length !== b.length) {
        return false;
    }

    // We can assume ids are unique
    // Doing a quick search indicated objects are tuned better than Map or Set
    const obj = a.reduce((prev, cur) => {
        prev[cur] = true;
        return prev;
    }, {} as Record<string, boolean>);

    for (let i = 0; i < b.length; i++) {
        if (!obj.hasOwnProperty(b[i])) {
            return false;
        }
    }
    return true;
}

export function errorAlert(error: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.calls_error_title',
            defaultMessage: 'Error',
        }),
        intl.formatMessage({
            id: 'mobile.calls_error_message',
            defaultMessage: 'Error: {error}',
        }, {error}),
    );
}

export function getICEServersConfigs(config: CallsConfig): RTCIceServer[] {
    // if ICEServersConfigs is set, we can trust this to be complete and
    // coming from an updated API.
    if (config.ICEServersConfigs && config.ICEServersConfigs.length > 0) {
        return config.ICEServersConfigs;
    }

    // otherwise we revert to using the now deprecated field.
    if (config.ICEServers && config.ICEServers.length > 0) {
        return [
            {
                urls: config.ICEServers,
            },
        ];
    }

    return [];
}

export function hexToRGB(h: string) {
    if (h.length !== 7 || h[0] !== '#') {
        throw new Error(`invalid hex color string '${h}'`);
    }

    return {
        r: parseInt(h[1] + h[2], 16),
        g: parseInt(h[3] + h[4], 16),
        b: parseInt(h[5] + h[6], 16),
    };
}

export function rgbToHSL(c: ColorRGB) {
    // normalize components into [0,1]
    const R = c.r / 255;
    const G = c.g / 255;
    const B = c.b / 255;

    // value
    const V = Math.max(R, G, B);

    // chroma
    const C = V - Math.min(R, G, B);

    // lightness
    const L = V - (C / 2);

    // saturation
    let S = 0;
    if (L > 0 && L < 1) {
        S = C / (1 - Math.abs((2 * V) - C - 1));
    }

    // hue
    let h = 0;
    if (C !== 0) {
        switch (V) {
            case R:
                h = 60 * (((G - B) / C) % 6);
                break;
            case G:
                h = 60 * (((B - R) / C) + 2);
                break;
            case B:
                h = 60 * (((R - G) / C) + 4);
                break;
        }
    }

    return {
        h: Math.round(h >= 0 ? h : h + 360),
        s: Math.round(S * 100),
        l: Math.round(L * 100),
    };
}

export function hslToRGB(c: ColorHSL) {
    const H = c.h;
    const S = c.s / 100;
    const L = c.l / 100;

    const f = (n: number) => {
        const k = (n + (H / 30)) % 12;
        const a = S * Math.min(L, 1 - L);
        return L - (a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };

    return {
        r: Math.round(f(0) * 255),
        g: Math.round(f(8) * 255),
        b: Math.round(f(4) * 255),
    };
}

export function rgbToCSS(c: ColorRGB) {
    return `rgb(${c.r},${c.g},${c.b})`;
}

export function makeCallsTheme(theme: Theme): CallsTheme {
    // Base color is Sidebar Text Hover Background.
    const baseColorHSL = rgbToHSL(hexToRGB(theme.sidebarTextHoverBg));

    // Setting lightness to 16 to improve contrast.
    baseColorHSL.l = 16;
    const baseColorRGB = hslToRGB(baseColorHSL);

    // badgeBG is baseColor with a 0.16 opacity white overlay on top.
    const badgeBgRGB = {
        r: Math.round(baseColorRGB.r + (255 * 0.16)),
        g: Math.round(baseColorRGB.g + (255 * 0.16)),
        b: Math.round(baseColorRGB.b + (255 * 0.16)),
    };

    // Setting new calls CSS variables.
    const newTheme = {...theme} as CallsTheme;
    newTheme.callsBg = rgbToCSS(baseColorRGB);
    newTheme.callsBgRgb = `${baseColorRGB.r},${baseColorRGB.g},${baseColorRGB.b}`;
    newTheme.callsBadgeBg = rgbToCSS(badgeBgRGB);

    return newTheme;
}
