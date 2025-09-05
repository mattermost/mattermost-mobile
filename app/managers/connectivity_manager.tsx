// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {useNetInfo} from '@react-native-community/netinfo';
import React, {useCallback, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';

import ConnectionBanner from '@components/connection_banner/connection_banner';
import {useBannerActions} from '@context/floating_banner';
import {withServerUrl} from '@context/server';
import {useAppState} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import WebsocketManager from '@managers/websocket_manager';
import {toMilliseconds} from '@utils/datetime';

type Props = {
    serverUrl: string;
    websocketState: WebsocketConnectedState;
}

const CONNECTION_BANNER_ID = 'global-connection-status';
const TIME_TO_OPEN = toMilliseconds({seconds: 3});
const TIME_TO_CLOSE = toMilliseconds({seconds: 1});

// Extract message generation logic for better testability
const getConnectionMessage = (
    websocketState: WebsocketConnectedState,
    isInternetReachable: boolean | null,
    formatMessage: (descriptor: {id: string; defaultMessage: string}) => string,
): string => {
    const isConnected = websocketState === 'connected';

    if (isConnected) {
        return formatMessage({id: 'connection_banner.connected', defaultMessage: 'Connection restored'});
    }

    if (websocketState === 'connecting') {
        return formatMessage({id: 'connection_banner.connecting', defaultMessage: 'Connecting...'});
    }

    if (isInternetReachable) {
        return formatMessage({id: 'connection_banner.not_reachable', defaultMessage: 'The server is not reachable'});
    }

    return formatMessage({id: 'connection_banner.not_connected', defaultMessage: 'Unable to connect to network'});
};

// Extract banner configuration logic
const createBannerConfig = (
    websocketState: WebsocketConnectedState,
    message: string,
    onDismiss: () => void,
) => {
    const isConnected = websocketState === 'connected';

    return {
        id: CONNECTION_BANNER_ID,
        title: '',
        message: '',
        position: 'bottom' as const,
        dismissible: true,
        autoHideDuration: isConnected ? TIME_TO_CLOSE : undefined,
        customContent: (
            <ConnectionBanner
                isConnected={isConnected}
                message={message}
                dismissible={true}
                onDismiss={onDismiss}
            />
        ),
    };
};

const ConnectivityManager: React.FC<Props> = ({websocketState}) => {
    const intl = useIntl();
    const netInfo = useNetInfo();
    const appState = useAppState();
    const {showCustom, hideBanner} = useBannerActions();

    const openTimeout = useRef<NodeJS.Timeout | null>(null);
    const closeTimeout = useRef<NodeJS.Timeout | null>(null);
    const isBannerVisible = useRef(false);

    const isConnected = websocketState === 'connected';

    const clearTimeoutRef = useCallback((timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const showConnectionBanner = useCallback(() => {
        isBannerVisible.current = true;
        clearTimeoutRef(closeTimeout);

        const message = getConnectionMessage(websocketState, netInfo.isInternetReachable, intl.formatMessage);
        const bannerConfig = createBannerConfig(websocketState, message, () => hideBanner(CONNECTION_BANNER_ID));

        showCustom(bannerConfig);
    }, [intl.formatMessage, websocketState, netInfo.isInternetReachable, showCustom, clearTimeoutRef, hideBanner]);

    const hideConnectionBanner = useCallback(() => {
        isBannerVisible.current = false;
        hideBanner(CONNECTION_BANNER_ID);
        clearTimeoutRef(closeTimeout);
    }, [hideBanner, clearTimeoutRef]);

    useEffect(() => {
        if (websocketState === 'connecting') {
            showConnectionBanner();
        } else if (!isConnected) {
            openTimeout.current = setTimeout(showConnectionBanner, TIME_TO_OPEN);
        }

        return () => {
            clearTimeoutRef(openTimeout);
            clearTimeoutRef(closeTimeout);
        };
    }, [websocketState, isConnected, showConnectionBanner, clearTimeoutRef]);

    useDidUpdate(() => {
        if (isConnected) {
            if (isBannerVisible.current) {
                showConnectionBanner();
            } else {
                clearTimeoutRef(openTimeout);
            }
        } else if (isBannerVisible.current) {
            clearTimeoutRef(closeTimeout);
            showConnectionBanner();
        } else if (appState === 'active') {
            showConnectionBanner();
        }
    }, [isConnected]);

    useDidUpdate(() => {
        if (appState === 'active') {
            if (!isConnected && !isBannerVisible.current) {
                if (!openTimeout.current) {
                    openTimeout.current = setTimeout(showConnectionBanner, TIME_TO_OPEN);
                }
            }
            if (isConnected && isBannerVisible.current) {
                showConnectionBanner();
            }
        } else {
            hideConnectionBanner();
            clearTimeoutRef(openTimeout);
            clearTimeoutRef(closeTimeout);
        }
    }, [appState === 'active']);

    return null;
};

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    websocketState: WebsocketManager.observeWebsocketState(serverUrl),
}));

export const testExports = {
    ConnectivityManager,
    getConnectionMessage,
    createBannerConfig,
    CONNECTION_BANNER_ID,
    TIME_TO_OPEN,
    TIME_TO_CLOSE,
};

export default withServerUrl(enhanced(ConnectivityManager));
