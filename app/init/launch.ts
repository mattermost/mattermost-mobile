// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, Linking} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {appEntry, upgradeEntry} from '@actions/remote/entry';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials, removeServerCredentials} from '@init/credentials';
import {queryThemeForCurrentTeam} from '@queries/servers/preference';
import {queryCurrentUserId} from '@queries/servers/system';
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
    let serverUrl: string | undefined;
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
            let hasCurrentUser = false;
            if (database) {
                EphemeralStore.theme = await queryThemeForCurrentTeam(database);
                const currentUserId = await queryCurrentUserId(database);
                hasCurrentUser = Boolean(currentUserId);
            }

            if (!hasCurrentUser) {
                // migrating from v1
                const result = await upgradeEntry(serverUrl);
                if (result.error) {
                    Alert.alert(
                        'Error Upgrading',
                        `An error ocurred while upgrading the app to the new version.\n\nDetails: ${result.error}\n\nThe app will now quit.`,
                        [{
                            text: 'OK',
                            onPress: async () => {
                                await DatabaseManager.destroyServerDatabase(serverUrl!);
                                await removeServerCredentials(serverUrl!);
                                Emm.exitApp();
                            },
                        }],
                    );
                    return;
                }
            }

            launchToHome({...props, launchType: hasCurrentUser ? LaunchType.Normal : LaunchType.Upgrade, serverUrl}, resetNavigation);
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
        case LaunchType.Normal:
            appEntry(props.serverUrl!);
            break;
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
    goToScreen(Screens.HOME, title, passProps);
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
