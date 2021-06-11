// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface DeepLink {
    serverUrl: string;
    teamName: string;
}

interface DeepLinkChannel extends DeepLink {
    channelName: string;
}

interface DeepLinkDM extends DeepLink {
    userName: string;
}

interface DeepLinkPermalink extends DeepLink {
    postId: string;
}

interface DeepLinkGM extends DeepLink {
    channelId: string;
}

const DeepLinkType = {
    Channel: 'channel',
    DirectMessage: 'dm',
    GroupMessage: 'gm',
    Invalid: 'invalid',
    Permalink: 'permalink',
} as const;

type DeepLinkType = typeof DeepLinkType[keyof typeof DeepLinkType];

interface DeepLinkWithData {
    type: DeepLinkType;
    data?: DeepLinkChannel | DeepLinkDM | DeepLinkGM | DeepLinkPermalink;
}

enum LaunchType {
    Normal = 'normal',
    DeepLink = 'deeplink',
    Notification = 'notification',
}

interface LaunchProps {
    extra?: DeepLinkWithData | NotificationWithData;
    launchType: LaunchType;
    launchError?: Boolean;
}

type OptionalLaunchProps = LaunchProps | undefined;
