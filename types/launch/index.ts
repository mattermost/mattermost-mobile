// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type DeepLinkType from '@constants/deep_linking';
import type LaunchType from '@constants/launch';

export interface DeepLink {
    serverUrl: string;
    teamName: string;
}

export interface DeepLinkChannel extends DeepLink {
    channelName: string;
}

export interface DeepLinkDM extends DeepLink {
    userName: string;
}

export interface DeepLinkPermalink extends DeepLink {
    postId: string;
}

export interface DeepLinkGM extends DeepLink {
    channelId: string;
}

export interface DeepLinkPlugin extends DeepLink {
    id: string;
}

export type DeepLinkType = typeof DeepLinkType[keyof typeof DeepLinkType];

export interface DeepLinkWithData {
    type: DeepLinkType;
    data?: DeepLinkChannel | DeepLinkDM | DeepLinkGM | DeepLinkPermalink | DeepLinkPlugin;
}

export type LaunchType = typeof LaunchType[keyof typeof LaunchType];

export interface LaunchProps {
    extra?: DeepLinkWithData | NotificationWithData;
    launchType: LaunchType;
    launchError?: Boolean;
    serverUrl?: string;
    displayName?: string;
    time?: number;
}
