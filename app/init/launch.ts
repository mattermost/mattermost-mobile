// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, Linking, Platform} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {appEntry, pushNotificationEntry, upgradeEntry} from '@actions/remote/entry';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials, removeServerCredentials} from '@init/credentials';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {getCurrentUserId} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {goToScreen, resetToHome, resetToSelectServer, resetToTeams} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {DeepLinkChannel, DeepLinkDM, DeepLinkGM, DeepLinkPermalink, DeepLinkType, DeepLinkWithData, LaunchProps, LaunchType} from '@typings/launch';
import {convertToNotificationData} from '@utils/notification';
import {parseDeepLink} from '@utils/url';

export const initialLaunch = async () => {
    const deepLinkUrl = await Linking.getInitialURL();
    if (deepLinkUrl) {
        launchAppFromDeepLink(deepLinkUrl);
        return;
    }

    const notification = await Notifications.getInitialNotification();
    let tapped = Platform.select({android: true, ios: false})!;
    if (Platform.OS === 'ios') {
        // when a notification is received on iOS, getInitialNotification, will return the notification
        // as the app will initialized cause we are using background fetch,
        // that does not necessarily mean that the app was opened cause of the notification was tapped.
        // Here we are going to dettermine if the notification still exists in NotificationCenter to determine if
        // the app was opened because of a tap or cause of the background fetch init
        const delivered = await Notifications.ios.getDeliveredNotifications();
        tapped = delivered.find((d) => (d as unknown as NotificationData).ack_id === notification?.payload.ack_id) == null;
    }
    if (notification?.payload?.type === 'message' && tapped) {
        launchAppFromNotification(convertToNotificationData(notification));
        return;
    }

    launchApp({launchType: LaunchType.Normal});
};

const launchAppFromDeepLink = (deepLinkUrl: string) => {
    const props = getLaunchPropsFromDeepLink(deepLinkUrl);
    launchApp(props);
};

const launchAppFromNotification = async (notification: NotificationWithData) => {
    const props = await getLaunchPropsFromNotification(notification);
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
            serverUrl = props.serverUrl;
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
                EphemeralStore.theme = await getThemeForCurrentTeam(database);
                const currentUserId = await getCurrentUserId(database);
                hasCurrentUser = Boolean(currentUserId);
            }

            let launchType = props.launchType;
            if (!hasCurrentUser) {
                // migrating from v1
                if (launchType === LaunchType.Normal) {
                    launchType = LaunchType.Upgrade;
                }

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

            launchToHome({...props, launchType, serverUrl});

            return;
        }
    }

    launchToServer(props, resetNavigation);
};

const launchToHome = async (props: LaunchProps) => {
    let openPushNotification = false;

    switch (props.launchType) {
        case LaunchType.DeepLink:
            // TODO:
            // deepLinkEntry({props.serverUrl, props.extra});
            break;
        case LaunchType.Notification: {
            const extra = props.extra as NotificationWithData;
            openPushNotification = Boolean(props.serverUrl && !props.launchError && extra.userInteraction && extra.payload?.channel_id && !extra.payload?.userInfo?.local);
            if (openPushNotification) {
                pushNotificationEntry(props.serverUrl!, extra);
            } else {
                appEntry(props.serverUrl!);
            }
            break;
        }
        case LaunchType.Normal:
            appEntry(props.serverUrl!);
            break;
    }

    let nTeams = 0;
    if (props.serverUrl) {
        const database = DatabaseManager.serverDatabases[props.serverUrl]?.database;
        if (database) {
            nTeams = await queryMyTeams(database).fetchCount();
        }
    }

    if (nTeams) {
        // eslint-disable-next-line no-console
        console.log('Launch app in Home screen');
        resetToHome(props);
    } else {
        // eslint-disable-next-line no-console
        console.log('Launch app in Select Teams screen');
        resetToTeams();
    }
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

export const getLaunchPropsFromNotification = async (notification: NotificationWithData): Promise<LaunchProps> => {
    const launchProps: LaunchProps = {
        launchType: LaunchType.Notification,
    };

    const {payload} = notification;
    launchProps.extra = notification;

    if (payload?.server_url) {
        launchProps.serverUrl = payload.server_url;
    } else if (payload?.server_id) {
        const serverUrl = await DatabaseManager.getServerUrlFromIdentifier(payload.server_id);
        if (serverUrl) {
            launchProps.serverUrl = serverUrl;
        } else {
            launchProps.launchError = true;
        }
    } else {
        launchProps.launchError = true;
    }

    return launchProps;
};
