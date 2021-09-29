// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {appEntry} from '@actions/remote/entry';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials} from '@init/credentials';
import {queryThemeForCurrentTeam} from '@queries/servers/preference';
import {goToScreen, resetToHome, resetToSelectServer} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {DeepLinkChannel, DeepLinkDM, DeepLinkGM, DeepLinkPermalink, DeepLinkType, DeepLinkWithData, LaunchProps, LaunchType} from '@typings/launch';
import {parseDeepLink} from '@utils/url';

export const initialLaunch = async () => {
    const deepLinkUrl = await Linking.getInitialURL();
    if (deepLinkUrl) {
        launchAppFromDeepLink(deepLinkUrl);
        return;
    }

    const notification = await Notifications.getInitialNotification();
    if (notification && notification.payload?.type === 'message') {
        launchAppFromNotification(notification);
        return;
    }

    launchApp({launchType: LaunchType.Normal});
};

const launchAppFromDeepLink = (deepLinkUrl: string) => {
    const props = getLaunchPropsFromDeepLink(deepLinkUrl);
    launchApp(props);
};

const launchAppFromNotification = (notification: NotificationWithData) => {
    const props = getLaunchPropsFromNotification(notification);
    launchApp(props);
};

const launchApp = async (props: LaunchProps, resetNavigation = true) => {
    let serverUrl;
    switch (props?.launchType) {
        case LaunchType.DeepLink:
            if (props.extra?.type !== DeepLinkType.Invalid) {
                const extra = props.extra as DeepLinkWithData;
                serverUrl = extra.data?.serverUrl;
            }
            break;
        case LaunchType.Notification: {
            const extra = props.extra as NotificationWithData;
            serverUrl = extra.payload?.server_url;
            break;
        }
        default:
            serverUrl = await getActiveServerUrl();
            break;
    }

    if (props.launchError && !serverUrl) {
        serverUrl = await getActiveServerUrl();
    }

    if (serverUrl) {
        const credentials = await getServerCredentials(serverUrl);
        if (credentials) {
            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (database) {
                EphemeralStore.theme = await queryThemeForCurrentTeam(database);
            }

            launchToHome({...props, serverUrl}, resetNavigation);

            return;
        }
    }

    launchToServer(props, resetNavigation);
};

const launchToHome = (props: LaunchProps, resetNavigation: Boolean) => {
    switch (props.launchType) {
        case LaunchType.DeepLink:
            // TODO:
            // deepLinkEntry({props.serverUrl, props.extra});
            break;
        case LaunchType.Notification: {
            // TODO:
            // pushNotificationEntry({props.serverUrl, props.extra})
            break;
        }
        default:
            appEntry(props.serverUrl!);
    }

    const passProps = {
        skipMetrics: true,
        ...props,
    };

    if (resetNavigation) {
        // eslint-disable-next-line no-console
        console.log('Launch app in Home screen');
        resetToHome(passProps);
        return;
    }

    const title = '';
    goToScreen(Screens.CHANNEL, title, passProps);
};

const launchToServer = (props: LaunchProps, resetNavigation: Boolean) => {
    if (resetNavigation) {
        resetToSelectServer(props);
        return;
    }

    const title = '';
    goToScreen(Screens.SERVER, title, {...props});
};

export const relaunchApp = (props: LaunchProps, resetNavigation = false) => {
    launchApp(props, resetNavigation);
};

export const getLaunchPropsFromDeepLink = (deepLinkUrl: string): LaunchProps => {
    const parsed = parseDeepLink(deepLinkUrl);
    const launchProps: LaunchProps = {
        launchType: LaunchType.DeepLink,
    };

    switch (parsed.type) {
        case DeepLinkType.Invalid:
            launchProps.launchError = true;
            break;
        case DeepLinkType.Channel: {
            const parsedData = parsed.data as DeepLinkChannel;
            (launchProps.extra as DeepLinkWithData).data = parsedData;
            break;
        }
        case DeepLinkType.DirectMessage: {
            const parsedData = parsed.data as DeepLinkDM;
            (launchProps.extra as DeepLinkWithData).data = parsedData;
            break;
        }
        case DeepLinkType.GroupMessage: {
            const parsedData = parsed.data as DeepLinkGM;
            (launchProps.extra as DeepLinkWithData).data = parsedData;
            break;
        }
        case DeepLinkType.Permalink: {
            const parsedData = parsed.data as DeepLinkPermalink;
            (launchProps.extra as DeepLinkWithData).data = parsedData;
            break;
        }
    }

    return launchProps;
};

export const getLaunchPropsFromNotification = (notification: NotificationWithData): LaunchProps => {
    const {payload} = notification;

    const launchProps: LaunchProps = {
        launchType: LaunchType.Notification,
    };

    if (payload?.server_url) {
        (launchProps.extra as NotificationWithData) = notification;
    } else {
        launchProps.launchError = true;
    }

    return launchProps;
};
