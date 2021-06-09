// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {DeepLink, Notification, Screens} from '@constants';
import {getActiveServerCredentials, getServerCredentials} from '@init/credentials';
import {goToScreen, resetToChannel, resetToSelectServer} from '@screens/navigation';
import {parseDeepLink} from '@utils/url';

import type {LaunchProps} from '@typings/launch';

export const initialLaunch = async () => {
    const deepLinkUrl = await Linking.getInitialURL();
    if (deepLinkUrl) {
        launchAppFromDeepLink(deepLinkUrl);
        return;
    }

    const notification = await Notifications.getInitialNotification();
    if (notification) {
        launchAppFromNotification(notification);
        return;
    }

    launchApp();
};

const launchAppFromDeepLink = (deepLinkUrl: string) => {
    const props = getLaunchPropsFromDeepLink(deepLinkUrl);
    launchApp(props);
};

const launchAppFromNotification = (notification: NotificationWithData) => {
    const props = getLaunchPropsFromNotification(notification);
    launchApp(props);
};

const launchApp = async (props: LaunchProps | null = null, resetNavigation = true) => {
    const credentials = props?.serverUrl ?
        await getServerCredentials(props.serverUrl) :
        await getActiveServerCredentials();

    if (credentials) {
        launchToChannel(props, resetNavigation);
        return;
    }

    launchToServer(props, resetNavigation);
};

const launchToChannel = (props: LaunchProps | null, resetNavigation: Boolean) => {
    // TODO: Use LaunchProps to fetch posts for channel and then load user profile, etc...

    const passProps = {
        skipMetrics: true,
        ...props,
    };

    if (resetNavigation) {
        // eslint-disable-next-line no-console
        console.log('Launch app in Channel screen');
        resetToChannel(passProps);
        return;
    }

    const title = '';
    goToScreen(Screens.CHANNEL, title, passProps);
};

const launchToServer = (props: LaunchProps | null, resetNavigation: Boolean) => {
    // TODO: Do we need to do anything else with LaunchProps?
    const passProps = {...props};

    if (resetNavigation) {
        resetToSelectServer(passProps);
        return;
    }

    const title = '';
    goToScreen(Screens.SERVER, title, passProps);
};

export const relaunchApp = (props: LaunchProps | null = null) => {
    launchApp(props, false);
};

export const getLaunchPropsFromDeepLink = (deepLinkUrl: string): LaunchProps => {
    const parsed = parseDeepLink(deepLinkUrl);
    const launchProps: LaunchProps = {
        launchType: parsed.type,
    };

    if (parsed.type === DeepLink.INVALID) {
        launchProps.errorMessage = 'Did not find a server for this deep link';
    } else {
        launchProps.channelId = parsed.channelId;
        launchProps.channelName = parsed.channelName;
        launchProps.postId = parsed.postId;
        launchProps.serverUrl = parsed.serverUrl;
        launchProps.teamName = parsed.teamName;
        launchProps.userName = parsed.userName;
    }

    return launchProps;
};

export const getLaunchPropsFromNotification = (notification: NotificationWithData): LaunchProps => {
    const {payload} = notification;
    const launchProps: LaunchProps = {
        launchType: Notification.NOTIFICATION,
    };

    if (payload?.server_url) {
        launchProps.channelId = payload.channel_id;
        launchProps.channelName = payload.channel_name;
        launchProps.postId = payload.post_id;
        launchProps.serverUrl = payload.server_url;
        launchProps.teamId = payload.team_id;
    } else {
        launchProps.errorMessage = 'Did not find a server for this notification';
    }

    return launchProps;
};
