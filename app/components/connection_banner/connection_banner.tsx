// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {ANNOUNCEMENT_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    isDisconnected: boolean;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => {
    const bannerContainer = {
        flex: 1,
        paddingHorizontal: 10,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        borderRadius: 7,
    };
    return {
        background: {
            backgroundColor: theme.sidebarBg,
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

const ConnectionBanner = ({
    isDisconnected,
}: Props) => {
    const intl = useIntl();
    const closeTimeout = useRef<NodeJS.Timeout | null>();
    const height = useSharedValue(0);
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const style = getStyle(theme);

    useEffect(() => {
        if (isDisconnected) {
            if (visible) {
                if (closeTimeout.current) {
                    clearTimeout(closeTimeout.current);
                    closeTimeout.current = null;
                }
            } else {
                setVisible(true);
            }
        } else if (visible) {
            if (!closeTimeout.current) {
                closeTimeout.current = setTimeout(() => {
                    setVisible(false);
                    closeTimeout.current = null;
                }, 1000);
            }
        } else {
            // Do nothing
        }
    }, [isDisconnected]);

    useEffect(() => {
        height.value = withTiming(visible ? ANNOUNCEMENT_BAR_HEIGHT : 0, {
            duration: 200,
        });
    }, [visible]);

    useEffect(() => {
        return () => {
            if (closeTimeout.current) {
                clearTimeout(closeTimeout.current);
                closeTimeout.current = null;
            }
        };
    });

    const bannerStyle = useAnimatedStyle(() => ({
        height: height.value,
    }));

    const text = isDisconnected ? intl.formatMessage({id: 'connection_banner.not_reachable', defaultMessage: 'The server is not reachable'}) :
        intl.formatMessage({id: 'connection_banner.connected', defaultMessage: 'Connection restored'});

    return (
        <Animated.View
            style={[style.background, bannerStyle]}
        >
            <View
                style={isDisconnected ? style.bannerContainerNotConnected : style.bannerContainerConnected}
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
                            name={isDisconnected ? 'information-outline' : 'check'}
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
