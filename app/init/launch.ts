// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, DeviceEventEmitter, Linking, Platform} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {removePosts} from '@actions/local/post';
import {switchToChannelById} from '@actions/remote/channel';
import {appEntry, pushNotificationEntry} from '@actions/remote/entry';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import LocalConfig from '@assets/config.json';
import {DeepLink, Events, Launch, PushNotification} from '@constants';
import {PostTypes} from '@constants/post';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials} from '@init/credentials';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {getLastViewedChannelIdAndServer, getLastViewedThreadIdAndServer, getOnboardingViewed} from '@queries/app/global';
import {getAllServers} from '@queries/app/servers';
import {queryPostsByType} from '@queries/servers/post';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {queryMyTeams} from '@queries/servers/team';
import EphemeralStore from '@store/ephemeral_store';
import {handleDeepLink, getLaunchPropsFromDeepLink} from '@utils/deep_link';
import {logInfo} from '@utils/log';
import {convertToNotificationData} from '@utils/notification';
import {removeProtocol} from '@utils/url';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

/**
 * Initial route determination for Expo Router
 * Returns the route to navigate to with parameters
 */
export type ExpoRouterLaunchResult = {
    route: string;
    params: Record<string, any>;
};

const initialNotificationTypes = [PushNotification.NOTIFICATION_TYPE.MESSAGE, PushNotification.NOTIFICATION_TYPE.SESSION];

/**
 * Determine initial route for Expo Router based on app launch conditions
 */
export async function determineInitialExpoRoute(): Promise<ExpoRouterLaunchResult> {
    // Check for deep link launch
    const deepLinkUrl = await Linking.getInitialURL();
    if (deepLinkUrl) {
        return determineRouteFromDeeplink(deepLinkUrl);
    }

    // Check for notification launch
    const notification = await Notifications.getInitialNotification();
    let tapped = Platform.select({android: true, ios: false})!;
    if (Platform.OS === 'ios' && notification) {
        // when a notification is received on iOS, getInitialNotification, will return the notification
        // as the app will initialized cause we are using background fetch,
        // that does not necessarily mean that the app was opened cause of the notification was tapped.
        // Here we are going to dettermine if the notification still exists in NotificationCenter to determine if
        // the app was opened because of a tap or cause of the background fetch init
        const delivered = await Notifications.ios.getDeliveredNotifications();
        tapped = delivered.find((d) => (d as unknown as NotificationData).ack_id === notification?.payload.ack_id) == null;
    }
    if (initialNotificationTypes.includes(notification?.payload?.type) && tapped) {
        const notificationData = convertToNotificationData(notification!);
        EphemeralStore.setProcessingNotification(notificationData.identifier);
        return determineRouteFromNotification(notificationData);
    }

    // Normal launch
    const coldStart = notification ? (tapped || AppState.currentState === 'active') : true;
    return determineRoute({launchType: Launch.Normal, coldStart});
}

async function determineRouteFromDeeplink(deepLinkUrl: string): Promise<ExpoRouterLaunchResult> {
    const props = getLaunchPropsFromDeepLink(deepLinkUrl, true);
    return determineRoute(props);
}

async function determineRouteFromNotification(notification: NotificationWithData): Promise<ExpoRouterLaunchResult> {
    const launchProps: LaunchProps = {
        launchType: Launch.Notification,
        coldStart: true,
    };

    const {payload} = notification;
    launchProps.extra = notification;
    let serverUrl: string | undefined;

    try {
        if (payload?.server_url) {
            DatabaseManager.getServerDatabaseAndOperator(payload.server_url);
            serverUrl = payload.server_url;
        } else if (payload?.server_id) {
            serverUrl = await DatabaseManager.getServerUrlFromIdentifier(payload.server_id);
        }
    } catch {
        launchProps.launchError = true;
    }

    if (serverUrl) {
        launchProps.serverUrl = serverUrl;
    } else {
        launchProps.launchError = true;
    }

    return determineRoute(launchProps);
}

/**
 * Main launch function - matches structure of launchApp from app/init/launch.ts
 * Processes launch props and routes to appropriate Expo Router destination
 *
 * @param props set of properties used to determine how to launch the app depending on the containing values
 * @returns an Expo Router route result
 */
const determineRoute = async (props: LaunchProps): Promise<ExpoRouterLaunchResult> => {
    let serverUrl: string | undefined;
    switch (props?.launchType) {
        case Launch.DeepLink:
            if (props.extra && props.extra.type !== DeepLink.Invalid) {
                const extra = props.extra as DeepLinkWithData;
                const existingServer = DatabaseManager.searchUrl(extra.data!.serverUrl);
                serverUrl = existingServer;
                props.serverUrl = serverUrl || extra.data?.serverUrl;
                if (extra.type === DeepLink.MagicLink && extra.data && 'token' in extra.data) {
                    const result = await handleDeepLink(extra);
                    if (result.error) {
                        props.launchError = true;
                    } else {
                        serverUrl = await getActiveServerUrl();
                        return determineAuthenticatedRoute({...props, serverUrl});
                    }
                } else if (!serverUrl && extra.type !== DeepLink.Server) {
                    props.launchError = true;
                } else if (extra.type === DeepLink.Server) {
                    if (removeProtocol(serverUrl) === extra.data?.serverUrl) {
                        props.extra = undefined;
                        props.launchType = Launch.Normal;
                    } else {
                        serverUrl = await getActiveServerUrl();
                    }
                }
            }
            break;
        case Launch.Notification: {
            serverUrl = props.serverUrl;
            const extra = props.extra as NotificationWithData;
            const sessionExpiredNotification = Boolean(props.serverUrl && extra.payload?.type === PushNotification.NOTIFICATION_TYPE.SESSION);
            if (sessionExpiredNotification) {
                // Emit event - SessionManager will handle logout and relaunch
                DeviceEventEmitter.emit(Events.SESSION_EXPIRED, serverUrl);

                // Return current route - SessionManager will handle the rest
                // TODO: Determine if this is the correct approach for Expo Router
                // or if we should modify SecurityManager.onSessionExpired or create another function to return a route instead
                // and then have it include the route to go after home is loaded
                return determineRouteFromLaunchProps({launchType: Launch.Normal, coldStart: false});
            }
            break;
        }
        default:
            serverUrl = await getActiveServerUrl();
            break;
    }

    if (props.launchError && !serverUrl) {
        serverUrl = await getActiveServerUrl();
    }

    cleanupEphemeralPosts();

    return determineRouteFromLaunchProps({...props, serverUrl});
};

/**
 * Core logic to determine route based on launch props
 * This replicates the logic from app/init/launch.ts but returns Expo Router routes
 */
export async function determineRouteFromLaunchProps(props: LaunchProps): Promise<ExpoRouterLaunchResult> {
    if (props.serverUrl) {
        const credentials = await getServerCredentials(props.serverUrl);
        if (credentials) {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(props.serverUrl);
                const theme = await getThemeForCurrentTeam(database);
                EphemeralStore.setTheme(theme || getDefaultThemeByAppearance());
            } catch {
                EphemeralStore.setTheme(getDefaultThemeByAppearance());
            }

            return determineAuthenticatedRoute(props);
        }
    }

    // No logged in user - check if should show onboarding
    const onboardingViewed = LocalConfig.ShowOnboarding ? await getOnboardingViewed() : true;
    const theme = getDefaultThemeByAppearance();

    if (LocalConfig.ShowOnboarding && !onboardingViewed) {
        return {
            route: '/(unauthenticated)/onboarding',
            params: {
                ...props,
                theme: JSON.stringify(theme),
            },
        };
    }

    // Show server selection
    return {
        route: '/(unauthenticated)/server',
        params: {
            ...props,
            theme: JSON.stringify(theme),
        },
    };
}

async function determineAuthenticatedRoute(props: LaunchProps): Promise<ExpoRouterLaunchResult> {
    switch (props.launchType) {
        case Launch.DeepLink: {
            if (props.extra?.type !== DeepLink.MagicLink) {
                appEntry(props.serverUrl!);
            }
            break;
        }
        case Launch.Notification: {
            const extra = props.extra as NotificationWithData;
            const openPushNotification = Boolean(props.serverUrl && !props.launchError && extra.userInteraction && extra.payload?.channel_id && !extra.payload?.userInfo?.local);
            if (openPushNotification) {
                pushNotificationEntry(props.serverUrl!, extra.payload!, 'Notification');
                break;
            }

            appEntry(props.serverUrl!);
            break;
        }
        case Launch.Normal:
            if (props.coldStart) {
                const lastViewedChannel = await getLastViewedChannelIdAndServer();
                const lastViewedThread = await getLastViewedThreadIdAndServer();

                if (lastViewedThread && lastViewedThread.server_url === props.serverUrl && lastViewedThread.thread_id) {
                    PerformanceMetricsManager.setLoadTarget('THREAD');
                    fetchAndSwitchToThread(props.serverUrl!, lastViewedThread.thread_id);
                } else if (lastViewedChannel && lastViewedChannel.server_url === props.serverUrl && lastViewedChannel.channel_id) {
                    PerformanceMetricsManager.setLoadTarget('CHANNEL');
                    switchToChannelById(props.serverUrl!, lastViewedChannel.channel_id);
                } else {
                    PerformanceMetricsManager.setLoadTarget('HOME');
                }

                appEntry(props.serverUrl!);
            }
            break;
    }

    let nTeams = 0;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(props.serverUrl!);
        const myTeams = await queryMyTeams(database).fetch();
        nTeams = myTeams.length;
    } catch {
        nTeams = 0;
    }

    if (nTeams === 0) {
        logInfo('Route app to Teams screen');
        return {
            route: '/(authenticated)/select_team',
            params: props,
        };
    }

    logInfo('Route app to Home screen');
    return {
        route: '/(authenticated)/(home)',
        params: props,
    };
}

/**
 * Cleanup ephemeral posts from all server databases
 * Ephemeral posts are temporary posts (like command responses) that should not persist
 */
async function cleanupEphemeralPosts() {
    const servers = await getAllServers();

    await Promise.all(
        servers.map(async (server) => {
            const database = DatabaseManager.serverDatabases[server.url]?.database;
            if (!database) {
                return Promise.resolve();
            }
            const posts = await queryPostsByType(database, PostTypes.EPHEMERAL).fetch();
            return removePosts(server.url, posts);
        }),
    );
}
