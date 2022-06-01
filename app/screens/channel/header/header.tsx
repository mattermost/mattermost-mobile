// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Navigation, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {bottomSheet, popTopScreen, showModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import OtherMentionsBadge from './other_mentions_badge';
import ChannelQuickAction from './quick_actions';

import type {HeaderRightButton} from '@components/navigation_header/header';

type ChannelProps = {
    channelId: string;
    customStatus?: UserCustomStatus;
    isCustomStatusExpired: boolean;
    componentId?: string;
    displayName: string;
    isOwnDirectMessage: boolean;
    memberCount?: number;
    searchTerm: string;
    teamId: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    customStatusContainer: {
        flexDirection: 'row',
        height: 13,
        left: Platform.select({ios: undefined, default: -2}),
        marginTop: Platform.select({ios: undefined, default: 1}),
    },
    customStatusEmoji: {marginRight: 5},
    customStatusText: {
        alignItems: 'center',
        height: 13,
    },
    subtitle: {
        color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
        ...typography('Body', 75),
        lineHeight: 12,
        marginBottom: 8,
        marginTop: 2,
        height: 13,
    },
}));

const ChannelHeader = ({
    channelId, componentId, customStatus, displayName,
    isCustomStatusExpired, isOwnDirectMessage, memberCount,
    searchTerm, teamId,
}: ChannelProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const defaultHeight = useDefaultHeaderHeight();
    const insets = useSafeAreaInsets();

    const contextStyle = useMemo(() => ({
        top: defaultHeight + insets.top,
    }), [defaultHeight, insets.top]);

    const leftComponent = useMemo(() => {
        if (isTablet || !channelId || !teamId) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={channelId}/>);
    }, [isTablet, channelId, teamId]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, []);

    const onTitlePress = useCallback(() => {
        const title = intl.formatMessage({id: 'screens.channel_info', defaultMessage: 'Channel Info'});
        showModal(Screens.CHANNEL_INFO, title, {channelId});
    }, [channelId, intl]);

    const onChannelQuickAction = useCallback(() => {
        if (isTablet) {
            onTitlePress();
            return;
        }

        const renderContent = () => {
            return <ChannelQuickAction channelId={channelId}/>;
        };

        bottomSheet({
            title: '',
            renderContent,
            snapPoints: ['32%', 10],
            theme,
            closeButtonId: 'close-channel-quick-actions',
        });
    }, [channelId, isTablet, onTitlePress, theme]);

    const rightButtons: HeaderRightButton[] = useMemo(() => ([{
        iconName: 'magnify',
        onPress: () => {
            DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {screen: 'Search', params: {searchTerm: `in: ${searchTerm}`}});
            if (!isTablet) {
                popTopScreen(componentId);
            }
        },
    }, {
        iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
        onPress: onChannelQuickAction,
        buttonType: 'opacity',
    }]), [isTablet, searchTerm, onChannelQuickAction]);

    let title = displayName;
    if (isOwnDirectMessage) {
        title = intl.formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    let subtitle;
    if (memberCount) {
        subtitle = intl.formatMessage({id: 'channel_header.member_count', defaultMessage: '{count, plural, one {# member} other {# members}}'}, {count: memberCount});
    } else if (!customStatus || !customStatus.text || isCustomStatusExpired) {
        subtitle = intl.formatMessage({id: 'channel_header.info', defaultMessage: 'View info'});
    }

    const subtitleCompanion = useMemo(() => {
        if (memberCount || !customStatus || !customStatus.text || isCustomStatusExpired) {
            return (
                <CompassIcon
                    color={changeOpacity(theme.sidebarHeaderTextColor, 0.72)}
                    name='chevron-right'
                    size={14}
                />
            );
        } else if (customStatus && customStatus.text) {
            return (
                <View style={styles.customStatusContainer}>
                    {Boolean(customStatus.emoji) &&
                    <CustomStatusEmoji
                        customStatus={customStatus}
                        emojiSize={13}
                        style={styles.customStatusEmoji}
                    />
                    }
                    <View style={styles.customStatusText}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={styles.subtitle}
                        >
                            {customStatus.text}
                        </Text>
                    </View>
                </View>
            );
        }

        return undefined;
    }, [memberCount, customStatus, isCustomStatusExpired]);

    return (
        <>
            <NavigationHeader
                isLargeTitle={false}
                leftComponent={leftComponent}
                onBackPress={onBackPress}
                onTitlePress={onTitlePress}
                rightButtons={rightButtons}
                showBackButton={!isTablet}
                subtitle={subtitle}
                subtitleCompanion={subtitleCompanion}
                title={title}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
        </>
    );
};

export default ChannelHeader;
