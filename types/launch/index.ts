// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

export const DeepLinkType = {
    Channel: 'channel',
    DirectMessage: 'dm',
    GroupMessage: 'gm',
    Invalid: 'invalid',
    Permalink: 'permalink',
    Plugin: 'plugin',
} as const;

export type DeepLinkType = typeof DeepLinkType[keyof typeof DeepLinkType];

export interface DeepLinkWithData {
    type: DeepLinkType;
    data?: DeepLinkChannel | DeepLinkDM | DeepLinkGM | DeepLinkPermalink | DeepLinkPlugin;
}

export const LaunchType = {
    AddServer: 'add-server',
    Normal: 'normal',
    DeepLink: 'deeplink',
    Notification: 'notification',
    Upgrade: 'upgrade',
} as const;

export type LaunchType = typeof LaunchType[keyof typeof LaunchType];

export interface LaunchProps {
    extra?: DeepLinkWithData | NotificationWithData;
    launchType: LaunchType;
    launchError?: Boolean;
    serverUrl?: string;
    displayName?: string;
    time?: number;
}
