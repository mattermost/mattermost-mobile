// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {makeCallsBaseAndBadgeRGB, rgbToCSS} from '@mattermost/calls';
import {Alert} from 'react-native';
import {TextTrackType} from 'react-native-video';

import {buildFileUrl} from '@actions/remote/file';
import {Calls, Post} from '@constants';
import {NOTIFICATION_SUB_TYPE} from '@constants/push_notification';
import {isMinimumServerVersion} from '@utils/helpers';
import {displayUsername} from '@utils/user';

import type {
    CallsConfigState,
    CallSession,
    CallsTheme,
    CallsVersion,
    SelectedSubtitleTrack,
    SubtitleTrack,
} from '@calls/types/calls';
import type {CallsConfig, Caption} from '@mattermost/calls/lib/types';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {IntlShape} from 'react-intl';
import type {RTCIceServer} from 'react-native-webrtc';

const callsMessageRegex = /^\u200b.* is inviting you to a call$/;

export function sortSessions(locale: string, teammateNameDisplay: string, sessions?: Dictionary<CallSession>, presenterID?: string): CallSession[] {
    if (!sessions) {
        return [];
    }

    const sessns = Object.values(sessions);

    return sessns.sort(sortByName(locale, teammateNameDisplay)).sort(sortByState(presenterID));
}

const sortByName = (locale: string, teammateNameDisplay: string) => {
    return (a: CallSession, b: CallSession) => {
        const nameA = displayUsername(a.userModel, locale, teammateNameDisplay);
        const nameB = displayUsername(b.userModel, locale, teammateNameDisplay);
        return nameA.localeCompare(nameB);
    };
};

const sortByState = (presenterID?: string) => {
    return (a: CallSession, b: CallSession) => {
        if (a.sessionId === presenterID) {
            return -1;
        } else if (b.sessionId === presenterID) {
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

export function getHandsRaised(sessions: Dictionary<CallSession>) {
    return Object.values(sessions).filter((s) => s.raisedHand);
}

export function getHandsRaisedNames(sessions: CallSession[], sessionId: string, locale: string, teammateNameDisplay: string, intl: IntlShape) {
    return sessions.sort((a, b) => a.raisedHand - b.raisedHand).map((p) => {
        if (p.sessionId === sessionId) {
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

export function isMultiSessionSupported(callsVersion: CallsVersion) {
    return isMinimumServerVersion(
        callsVersion.version,
        Calls.MultiSessionCallsVersion.MAJOR_VERSION,
        Calls.MultiSessionCallsVersion.MIN_VERSION,
        Calls.MultiSessionCallsVersion.PATCH_VERSION,
    );
}

export function isHostControlsAllowed(config: CallsConfigState) {
    return Boolean(config.HostControlsAllowed);
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

export function makeCallsTheme(theme: Theme): CallsTheme {
    const {baseColorRGB, badgeBgRGB} = makeCallsBaseAndBadgeRGB(theme.sidebarBg);

    const newTheme = {...theme} as CallsTheme;
    newTheme.callsBg = rgbToCSS(baseColorRGB);
    newTheme.callsBgRgb = `${baseColorRGB.r},${baseColorRGB.g},${baseColorRGB.b}`;
    newTheme.callsBadgeBg = rgbToCSS(badgeBgRGB);

    return newTheme;
}

interface HasUserId {
    userId: string;
}

export function userIds<T extends HasUserId>(hasUserId: T[]): string[] {
    const ids: string[] = [];
    const seen: Record<string, boolean> = {};
    for (const p of hasUserId) {
        if (!seen[p.userId]) {
            ids.push(p.userId);
            seen[p.userId] = true;
        }
    }
    return ids;
}

export function fillUserModels(sessions: Dictionary<CallSession>, models: UserModel[]) {
    const idToModel = models.reduce((accum, cur) => {
        accum[cur.id] = cur;
        return accum;
    }, {} as Dictionary<UserModel>);
    const next = {...sessions};
    for (const participant of Object.values(next)) {
        participant.userModel = idToModel[participant.userId];
    }
    return sessions;
}

export function isCallsStartedMessage(payload?: NotificationData) {
    if (payload?.sub_type === NOTIFICATION_SUB_TYPE.CALLS) {
        return true;
    }

    // MM-55506 - Remove once we can assume MM servers will be >= 9.3.0, mobile will be >= 2.11.0,
    // calls will be >= 0.21.0, and push proxy will be >= 5.27.0
    return (payload?.message === 'You\'ve been invited to a call' || callsMessageRegex.test(payload?.message || ''));
}

export const hasCaptions = (postProps?: Record<string, any> & { captions?: Caption[] }): boolean => {
    return !(!postProps || !postProps.captions?.[0]);
};

export const getTranscriptionUri = (serverUrl: string, postProps?: Record<string, any> & { captions?: Caption[] }): {
    tracks?: SubtitleTrack[];
    selected: SelectedSubtitleTrack;
} => {
    // Note: We're not using hasCaptions above because this tells typescript that the caption exists later.
    // We could use some fancy typescript to do the same, but it's not worth the complexity.
    if (!postProps || !postProps.captions?.[0]) {
        return {
            tracks: undefined,
            selected: {type: 'disabled'},
        };
    }

    const tracks: SubtitleTrack[] = postProps.captions.map((t) => ({
        title: t.title,
        language: t.language,
        type: TextTrackType.VTT,
        uri: buildFileUrl(serverUrl, t.file_id),
    }));

    return {
        tracks,
        selected: {type: 'index', value: 0},
    };
};
