// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNetInfo} from '@react-native-community/netinfo';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {ANNOUNCEMENT_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {toMilliseconds} from '@utils/datetime';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    websocketState: WebsocketConnectedState;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => {
    const bannerContainer = {
        flex: 1,
        paddingHorizontal: 10,
        overflow: 'hidden' as const,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginHorizontal: 8,
        borderRadius: 7,
    };
    return {
        background: {
            backgroundColor: theme.sidebarBg,
            zIndex: 1,
        },
        bannerContainerNotConnected: {
            ...bannerContainer,
            backgroundColor: theme.centerChannelColor,
        },
        bannerContainerConnected: {
            ...bannerContainer,
            backgroundColor: theme.onlineIndicator,
        },
        wrapper: {
            flexDirection: 'row',
            flex: 1,
            overflow: 'hidden',
        },
        bannerTextContainer: {
            flex: 1,
            flexGrow: 1,
            marginRight: 5,
            textAlign: 'center',
            color: theme.centerChannelBg,
        },
        bannerText: {
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

const clearTimeoutRef = (ref: React.MutableRefObject<NodeJS.Timeout | null | undefined>) => {
    if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
    }
};

const TIME_TO_OPEN = toMilliseconds({seconds: 3});
const TIME_TO_CLOSE = toMilliseconds({seconds: 1});

const ConnectionBanner = ({
    websocketState,
}: Props) => {
    const intl = useIntl();
    const closeTimeout = useRef<NodeJS.Timeout | null>();
    const openTimeout = useRef<NodeJS.Timeout | null>();
    const height = useSharedValue(0);
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const style = getStyle(theme);
    const appState = useAppState();
    const netInfo = useNetInfo();

    const isConnected = websocketState === 'connected';

    const openCallback = useCallback(() => {
        setVisible(true);
        clearTimeoutRef(openTimeout);
    }, []);

    const closeCallback = useCallback(() => {
        setVisible(false);
        clearTimeoutRef(closeTimeout);
    }, []);

    useEffect(() => {
        if (websocketState === 'connecting') {
            openCallback();
        } else if (!isConnected) {
            openTimeout.current = setTimeout(openCallback, TIME_TO_OPEN);
        }
        return () => {
            clearTimeoutRef(openTimeout);
            clearTimeoutRef(closeTimeout);
        };
    }, []);

    useDidUpdate(() => {
        if (isConnected) {
            if (visible) {
                if (!closeTimeout.current) {
                    closeTimeout.current = setTimeout(closeCallback, TIME_TO_CLOSE);
                }
            } else {
                clearTimeoutRef(openTimeout);
            }
        } else if (visible) {
            clearTimeoutRef(closeTimeout);
        } else if (appState === 'active') {
            setVisible(true);
        }
    }, [isConnected]);

    useDidUpdate(() => {
        if (appState === 'active') {
            if (!isConnected && !visible) {
                if (!openTimeout.current) {
                    openTimeout.current = setTimeout(openCallback, TIME_TO_OPEN);
                }
            }
            if (isConnected && visible) {
                if (!closeTimeout.current) {
                    closeTimeout.current = setTimeout(closeCallback, TIME_TO_CLOSE);
                }
            }
        } else {
            setVisible(false);
            clearTimeoutRef(openTimeout);
            clearTimeoutRef(closeTimeout);
        }
    }, [appState === 'active']);

    useEffect(() => {
        height.value = withTiming(visible ? ANNOUNCEMENT_BAR_HEIGHT : 0, {
            duration: 200,
        });
    }, [height, visible]);

    const bannerStyle = useAnimatedStyle(() => ({
        height: height.value,
    }));

    let text;
    if (isConnected) {
        text = intl.formatMessage({id: 'connection_banner.connected', defaultMessage: 'Connection restored'});
    } else if (websocketState === 'connecting') {
        text = intl.formatMessage({id: 'connection_banner.connecting', defaultMessage: 'Connecting...'});
    } else if (netInfo.isInternetReachable) {
        text = intl.formatMessage({id: 'connection_banner.not_reachable', defaultMessage: 'The server is not reachable'});
    } else {
        text = intl.formatMessage({id: 'connection_banner.not_connected', defaultMessage: 'No internet connection'});
    }

    return (
        <Animated.View
            style={[style.background, bannerStyle]}
        >
            <View
                style={isConnected ? style.bannerContainerConnected : style.bannerContainerNotConnected}
            >
                {visible &&
                <View
                    style={style.wrapper}
                >
                    <Text
                        style={style.bannerTextContainer}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        <CompassIcon
                            color={theme.centerChannelBg}
                            name={isConnected ? 'check' : 'information-outline'}
                            size={18}
                        />
                        {'  '}
                        <Text style={style.bannerText}>
                            {text}
                        </Text>
                    </Text>
                </View>
                }
            </View>
        </Animated.View>
    );
};

export default ConnectionBanner;
