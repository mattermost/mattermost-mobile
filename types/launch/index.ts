// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {DeepLink as DeepLinkConstant, Launch} from '@constants';

export interface DeepLink {
    serverUrl: string;
    teamName: string;
}

export interface DeepLinkServer {
    serverUrl: string;
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
    channelName: string;
}

export interface DeepLinkPlugin extends DeepLink {
    id: string;
    route?: string;
}

export type DeepLinkType = typeof DeepLinkConstant[keyof typeof DeepLinkConstant];

export interface DeepLinkWithData {
    type: DeepLinkType;
    url: string;
    data?: DeepLinkChannel | DeepLinkDM | DeepLinkGM | DeepLinkPermalink | DeepLinkPlugin | DeepLinkServer;
}

export type LaunchType = typeof Launch[keyof typeof Launch];

export interface LaunchProps {
    extra?: DeepLinkWithData | NotificationWithData;
    launchType: LaunchType;
    launchError?: Boolean;
    serverUrl?: string;
    displayName?: string;
    coldStart?: boolean;
}
