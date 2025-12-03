// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

import useDidUpdate from '@hooks/did_update';

import type {NetworkPerformanceState} from '@managers/network_performance_manager';
import type {NetInfoState} from '@react-native-community/netinfo';
import type {IntlShape} from 'react-intl';

const CLOSE_TIMEOUT_DURATION_MS = 2000;

const clearTimeoutRef = (ref: React.MutableRefObject<NodeJS.Timeout | null | undefined>) => {
    if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
    }
};

type UseConnectionBannerParams = {
    websocketState: WebsocketConnectedState;
    networkPerformanceState: NetworkPerformanceState;
    netInfo: NetInfoState;
    appState: string;
    intl: IntlShape;
};

type UseConnectionBannerReturn = {
    visible: boolean;
    bannerText: string;
    isShowingConnectedBanner: boolean;
};

export const useConnectionBanner = ({
    websocketState,
    networkPerformanceState,
    netInfo,
    appState,
    intl,
}: UseConnectionBannerParams): UseConnectionBannerReturn => {
    const closeTimeout = useRef<NodeJS.Timeout | null>();
    const openTimeout = useRef<NodeJS.Timeout | null>();
    const initialAppSession = useRef(true);
    const previousWebsocketState = useRef<WebsocketConnectedState>(websocketState);
    const hasShownSlowBanner = useRef(false);

    const [visible, setVisible] = useState(false);
    const [bannerText, setBannerText] = useState('');
    const [isShowingConnectedBanner, setIsShowingConnectedBanner] = useState(false);

    const closeCallback = useCallback(() => {
        setVisible(false);
        clearTimeoutRef(closeTimeout);
    }, []);

    const openCallback = useCallback(() => {
        clearTimeoutRef(closeTimeout);
        clearTimeoutRef(openTimeout);
        setVisible(true);
    }, []);

    const handleDisconnectedState = useCallback((): boolean => {
        if (websocketState === 'not_connected') {
            previousWebsocketState.current = 'not_connected';

            if (!initialAppSession.current) {
                setBannerText(intl.formatMessage({id: 'connection_banner.not_connected', defaultMessage: 'Unable to connect to network'}));
                openCallback();
                return true;
            }
        }
        return false;
    }, [websocketState, openCallback, intl]);

    const handleInternetUnreachableState = useCallback((): boolean => {
        if (netInfo.isInternetReachable === false) {
            setBannerText(intl.formatMessage({id: 'connection_banner.not_reachable', defaultMessage: 'The server is not reachable'}));
            openCallback();
            closeTimeout.current = setTimeout(closeCallback, CLOSE_TIMEOUT_DURATION_MS);
            return true;
        }
        return false;
    }, [netInfo.isInternetReachable, intl, openCallback, closeCallback]);

    const handleSlowNetworkState = useCallback((): boolean => {
        if (networkPerformanceState === 'slow' && !hasShownSlowBanner.current) {
            hasShownSlowBanner.current = true;

            setBannerText(intl.formatMessage({id: 'connection_banner.slow', defaultMessage: 'Limited network connection'}));
            openCallback();
            closeTimeout.current = setTimeout(() => {
                closeCallback();
            }, CLOSE_TIMEOUT_DURATION_MS);
            return true;
        }
        return false;
    }, [networkPerformanceState, intl, openCallback, closeCallback]);

    const handleConnectedState = useCallback((): boolean => {
        if (websocketState === 'connected' && previousWebsocketState.current !== 'connected') {
            previousWebsocketState.current = 'connected';
            if (!initialAppSession.current && !isShowingConnectedBanner) {
                setIsShowingConnectedBanner(true);
                setBannerText(intl.formatMessage({id: 'connection_banner.connected', defaultMessage: 'Connection restored'}));
                openCallback();
                closeTimeout.current = setTimeout(() => {
                    closeCallback();

                    setIsShowingConnectedBanner(false);
                }, CLOSE_TIMEOUT_DURATION_MS);
                return true;
            }

            initialAppSession.current = false;
            return true;
        }
        return false;
    }, [websocketState, intl, openCallback, closeCallback, isShowingConnectedBanner]);

    const handleConnectingState = useCallback((): boolean => {
        if (websocketState === 'connecting') {
            if (!initialAppSession.current) {
                setBannerText(intl.formatMessage({id: 'connection_banner.connecting', defaultMessage: 'Connecting...'}));
                openCallback();
                return true;
            }
            previousWebsocketState.current = 'connecting';
        }
        return false;
    }, [websocketState, intl, openCallback]);

    useEffect(() => {
        return () => {
            clearTimeoutRef(closeTimeout);
            clearTimeoutRef(openTimeout);
        };
    }, []);

    useEffect(() => {
        if (appState !== 'active') {
            return;
        }
        if (visible && closeTimeout.current) {
            return;
        }

        const priorities = () => {
            if (handleInternetUnreachableState()) {
                return;
            }
            if (handleDisconnectedState()) {
                return;
            }
            if (handleSlowNetworkState()) {
                return;
            }
            if (handleConnectedState()) {
                return;
            }
            handleConnectingState();
        };

        priorities();
    }, [
        handleInternetUnreachableState,
        handleDisconnectedState,
        handleSlowNetworkState,
        handleConnectedState,
        handleConnectingState,
        visible,
        appState,
    ]);

    useDidUpdate(() => {
        if (appState !== 'active') {
            setVisible(false);
            setBannerText('');
            clearTimeoutRef(openTimeout);
            clearTimeoutRef(closeTimeout);
            hasShownSlowBanner.current = false;
            setIsShowingConnectedBanner(false);
        }
    }, [appState]);

    return {
        visible,
        bannerText,
        isShowingConnectedBanner,
    };
};

