// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@app/context/theme';
import CompassIcon from '@components/compass_icon';
import RemoveMarkdown from '@components/remove_markdown';
import {Screens} from '@constants';
import {ANNOUNCEMENT_BAR_HEIGHT} from '@constants/view';
import {showModal} from '@screens/navigation';
import {typography} from '@utils/typography';

type Props = {
    bannerColor: string;
    bannerDismissed: boolean;
    bannerEnabled: boolean;
    bannerText?: string;
    bannerTextColor?: string;
}

const style = StyleSheet.create({
    bannerContainer: {
        paddingHorizontal: 10,
        overflow: 'hidden',
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
    },
    bannerText: {
        flex: 1,
        ...typography('Body', 100, 'Regular'),
        marginRight: 5,
    },
});

const AnnouncementBanner = ({
    bannerColor,
    bannerDismissed,
    bannerEnabled,
    bannerText = '',
    bannerTextColor = '#000',
}: Props) => {
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const height = useSharedValue(0);
    const theme = useTheme();
    const [visible, setVisible] = useState(false);

    const handlePress = useCallback(() => {
        const title = intl.formatMessage({
            id: 'mobile.announcement_banner.title',
            defaultMessage: 'Announcement',
        });
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-channel-info';

        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.channel_info.button',
                }],
            },
        };

        showModal(Screens.EXPANDED_ANNOUNCEMENT_BANNER, title, {closeButtonId}, options);
    }, [theme.sidebarHeaderTextColor, intl.locale]);

    useEffect(() => {
        const showBanner = bannerEnabled && !bannerDismissed && Boolean(bannerText);
        setVisible(showBanner);
    }, [bannerDismissed, bannerEnabled, bannerText]);

    useEffect(() => {
        height.value = withTiming(visible ? ANNOUNCEMENT_BAR_HEIGHT : 0, {
            duration: 500,
        });
    }, [visible]);

    const bannerStyle = useAnimatedStyle(() => ({
        backgroundColor: bannerColor,
        height: height.value,
    }));

    const bannerTextStyle = useMemo(() => [style.bannerText, {
        color: bannerTextColor,
    }], [bannerTextColor]);

    return (
        <Animated.View
            style={[style.bannerContainer, bannerStyle]}
        >
            {visible &&
            <TouchableOpacity
                onPress={handlePress}
                style={[style.wrapper, {marginLeft: insets.left, marginRight: insets.right}]}
            >
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={bannerTextStyle}
                >
                    <RemoveMarkdown
                        value={bannerText}

                    />
                </Text>
                <CompassIcon
                    color={bannerTextColor}
                    name='information-outline'
                    size={16}
                />
            </TouchableOpacity>
            }
        </Animated.View>
    );
};

export default AnnouncementBanner;
