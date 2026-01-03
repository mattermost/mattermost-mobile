// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {useEffect, useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {autoUpdateTimezone} from '@actions/remote/user';
import {Events, Launch, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useAppState} from '@hooks/device';
import SecurityManager from '@managers/security_manager';
import {getAllServers} from '@queries/app/servers';
import {navigateToScreen, resetToRootRoute} from '@screens/navigation';
import {NavigationStore} from '@store/navigation_store';
import {alertInvalidDeepLink, parseAndHandleDeepLink} from '@utils/deep_link';
import {logError} from '@utils/log';
import {alertChannelArchived, alertChannelRemove, alertTeamRemove} from '@utils/navigation';
import {notificationError} from '@utils/notification';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

const updateTimezoneIfNeeded = async () => {
    try {
        const servers = await getAllServers();
        for (const server of servers) {
            if (server.url && server.lastActiveAt > 0) {
                autoUpdateTimezone(server.url);
            }
        }
    } catch (e) {
        logError('Localize change', e);
    }
};

export function useHomeScreenEffects(props: LaunchProps) {
    const intl = useIntl();
    const appState = useAppState();
    const serverUrl = useServerUrl();

    useEffect(() => {
        SecurityManager.start();
        updateTimezoneIfNeeded();
    }, []);

    const handleFindChannels = useCallback(() => {
        if (!NavigationStore.isScreenInStack(Screens.FIND_CHANNELS)) {
            navigateToScreen(Screens.FIND_CHANNELS);
        }
    }, []);

    const events = useMemo(() => ({onFindChannels: handleFindChannels}), [handleFindChannels]);
    useHardwareKeyboardEvents(events);

    useEffect(() => {
        const notificationErrorListener = DeviceEventEmitter.addListener(Events.NOTIFICATION_ERROR, (value: 'Team' | 'Channel' | 'Post' | 'Connection') => {
            notificationError(intl, value);
        });

        const leaveTeamListener = DeviceEventEmitter.addListener(Events.LEAVE_TEAM, (displayName: string) => {
            alertTeamRemove(displayName, intl);
        });

        const leaveChannelListener = DeviceEventEmitter.addListener(Events.LEAVE_CHANNEL, (displayName: string) => {
            alertChannelRemove(displayName, intl);
        });

        const archivedChannelListener = DeviceEventEmitter.addListener(Events.CHANNEL_ARCHIVED, (displayName: string) => {
            alertChannelArchived(displayName, intl);
        });

        const crtToggledListener = DeviceEventEmitter.addListener(Events.CRT_TOGGLED, (isSameServer: boolean) => {
            if (isSameServer) {
                resetToRootRoute();
            }
        });

        return () => {
            notificationErrorListener.remove();
            leaveTeamListener.remove();
            leaveChannelListener.remove();
            archivedChannelListener.remove();
            crtToggledListener.remove();
        };
    }, [intl]);

    useEffect(() => {
        if (appState === 'active') {
            autoUpdateTimezone(serverUrl);
        }
    }, [appState, serverUrl]);

    useEffect(() => {
        if (props.launchType === Launch.DeepLink) {
            if (props.launchError) {
                alertInvalidDeepLink(intl);
                return;
            }

            const deepLink = props.extra as DeepLinkWithData;
            if (deepLink?.url) {
                parseAndHandleDeepLink(deepLink.url, intl, Screens.HOME, true).then((result) => {
                    if (result.error) {
                        alertInvalidDeepLink(intl);
                    }
                });
            }
        }

    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
