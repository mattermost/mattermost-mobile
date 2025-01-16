// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {dismissAnnouncement} from '@actions/local/systems';
import CompassIcon from '@components/compass_icon';
import RemoveMarkdown from '@components/remove_markdown';
import {ANNOUNCEMENT_BAR_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ExpandedAnnouncementBanner from './expanded_announcement_banner';

type Props = {
    bannerColor: string;
    bannerDismissed: boolean;
    bannerEnabled: boolean;
    bannerText?: string;
    bannerTextColor?: string;
    allowDismissal: boolean;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => ({
    background: {
        backgroundColor: theme.sidebarBg,
        zIndex: 1,
    },
    bannerContainer: {
        flex: 1,
        paddingHorizontal: 10,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        borderRadius: 7,
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
    },
    bannerText: {
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const CLOSE_BUTTON_ID = 'announcement-close';

const BUTTON_HEIGHT = 48; // From /app/utils/buttonStyles.ts, lg button
const TITLE_HEIGHT = 30 + 12; // typography 600 line height
const MARGINS = 12 + 24 + 10; // (after title + after text + after content) from ./expanded_announcement_banner.tsx
const TEXT_CONTAINER_HEIGHT = 150;
const DISMISS_BUTTON_HEIGHT = BUTTON_HEIGHT + 10; // Top margin from ./expanded_announcement_banner.tsx

const SNAP_POINT_WITHOUT_DISMISS = TITLE_HEIGHT + BUTTON_HEIGHT + MARGINS + TEXT_CONTAINER_HEIGHT;

const AnnouncementBanner = ({
    bannerColor,
    bannerDismissed,
    bannerEnabled,
    bannerText = '',
    bannerTextColor = '#000',
    allowDismissal,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const height = useSharedValue(0);
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const style = getStyle(theme);
    const markdownTextStyles = getMarkdownTextStyles(theme);

    const renderContent = useCallback(() => (
        <ExpandedAnnouncementBanner
            allowDismissal={allowDismissal}
            bannerText={bannerText}
        />
    ), [allowDismissal, bannerText]);

    const handlePress = useCallback(() => {
        const title = intl.formatMessage({
            id: 'mobile.announcement_banner.title',
            defaultMessage: 'Announcement',
        });

        const snapPoint = bottomSheetSnapPoint(
            1,
            SNAP_POINT_WITHOUT_DISMISS + (allowDismissal ? DISMISS_BUTTON_HEIGHT : 0),
        );

        bottomSheet({
            closeButtonId: CLOSE_BUTTON_ID,
            title,
            renderContent,
            snapPoints: [1, snapPoint],
            theme,
        });
    }, [intl, allowDismissal, renderContent, theme]);

    const handleDismiss = useCallback(() => {
        dismissAnnouncement(serverUrl, bannerText);
    }, [serverUrl, bannerText]);

    useEffect(() => {
        const showBanner = bannerEnabled && !bannerDismissed && Boolean(bannerText);
        setVisible(showBanner);
    }, [bannerDismissed, bannerEnabled, bannerText]);

    useEffect(() => {
        height.value = withTiming(visible ? ANNOUNCEMENT_BAR_HEIGHT : 0, {
            duration: 200,
        });
    }, [height, visible]);

    const bannerStyle = useAnimatedStyle(() => ({
        height: height.value,
    }));

    const bannerTextContainerStyle = useMemo(() => [style.bannerTextContainer, {
        color: bannerTextColor,
    }], [style, bannerTextColor]);

    return (
        <Animated.View
            style={[style.background, bannerStyle]}
        >
            <View
                style={[style.bannerContainer, {backgroundColor: bannerColor}]}
            >
                {visible &&
                    <>
                        <TouchableOpacity
                            onPress={handlePress}
                            style={style.wrapper}
                        >
                            <Text
                                style={bannerTextContainerStyle}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                <CompassIcon
                                    color={bannerTextColor}
                                    name='information-outline'
                                    size={18}
                                />
                                {'  '}
                                <RemoveMarkdown
                                    value={bannerText}
                                    textStyle={markdownTextStyles}
                                    baseStyle={style.bannerText}
                                />
                            </Text>
                        </TouchableOpacity>
                        {allowDismissal && (
                            <TouchableOpacity
                                onPress={handleDismiss}
                            >
                                <CompassIcon
                                    color={changeOpacity(bannerTextColor, 0.56)}
                                    name='close'
                                    size={18}
                                />
                            </TouchableOpacity>
                        )
                        }
                    </>
                }
            </View>
        </Animated.View>
    );
};

export default AnnouncementBanner;
