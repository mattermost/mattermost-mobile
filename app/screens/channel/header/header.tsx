// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, Text, View} from 'react-native';

import {getCallsConfig} from '@calls/state';
import {CHANNEL_ACTIONS_OPTIONS_HEIGHT} from '@components/channel_actions/channel_actions';
import CompassIcon from '@components/compass_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import NavigationHeader from '@components/navigation_header';
import {ITEM_HEIGHT} from '@components/option_item';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {BOTTOM_SHEET_ANDROID_OFFSET} from '@screens/bottom_sheet';
import {bottomSheet, popTopScreen, showModal} from '@screens/navigation';
import {isTypeDMorGM} from '@utils/channel';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ChannelHeaderBookmarks from './bookmarks';
import QuickActions, {MARGIN, SEPARATOR_HEIGHT} from './quick_actions';

import type {HeaderRightButton} from '@components/navigation_header/header';
import type {AvailableScreens} from '@typings/screens/navigation';

type ChannelProps = {
    canAddBookmarks: boolean;
    channelId: string;
    channelType: ChannelType;
    customStatus?: UserCustomStatus;
    isBookmarksEnabled: boolean;
    isCustomStatusEnabled: boolean;
    isCustomStatusExpired: boolean;
    hasBookmarks: boolean;
    componentId?: AvailableScreens;
    displayName: string;
    isOwnDirectMessage: boolean;
    memberCount?: number;
    searchTerm: string;
    teamId: string;
    callsEnabledInChannel: boolean;
    groupCallsAllowed: boolean;
    isTabletView?: boolean;
    shouldRenderBookmarks: boolean;
    alias?: string;
    currentUserId?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    customStatusContainer: {
        flexDirection: 'row',
        height: 15,
        left: Platform.select({ios: undefined, default: -2}),
        marginTop: Platform.select({ios: undefined, default: 1}),
    },
    customStatusEmoji: {
        marginRight: 5,
        marginTop: Platform.select({ios: undefined, default: -2}),
    },
    customStatusText: {
        alignItems: 'center',
        height: 15,
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
    canAddBookmarks, channelId, channelType, componentId, customStatus, displayName, hasBookmarks,
    isBookmarksEnabled, isCustomStatusEnabled, isCustomStatusExpired, isOwnDirectMessage, memberCount,
    searchTerm, teamId, callsEnabledInChannel, groupCallsAllowed, isTabletView, shouldRenderBookmarks,
    alias, currentUserId,
}: ChannelProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const defaultHeight = useDefaultHeaderHeight();
    const serverUrl = useServerUrl();

    const callsConfig = getCallsConfig(serverUrl);

    // NOTE: callsEnabledInChannel will be true/false (not undefined) based on explicit state + the DefaultEnabled system setting
    //   which ultimately comes from channel/index.tsx, and observeIsCallsEnabledInChannel
    let callsAvailable = callsConfig.pluginEnabled && callsEnabledInChannel;
    if (!groupCallsAllowed && channelType !== General.DM_CHANNEL) {
        callsAvailable = false;
    }

    const isDMorGM = isTypeDMorGM(channelType);
    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const leftComponent = useMemo(() => {
        if (isTablet || !channelId || !teamId) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={channelId}/>);
    }, [isTablet, channelId, teamId]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    const onSetAlias = useCallback(() => {
        if (channelType !== General.DM_CHANNEL || !currentUserId) {
            return;
        }
        showModal(Screens.ALIAS_MODAL, intl.formatMessage({id: 'channel_header.set_alias.title', defaultMessage: 'Set Alias'}), {
            serverUrl,
            channelId,
            currentUserId,
            searchTerm,
        }, {
            topBar: {
                visible: false,
            },
        });
    }, [channelType, currentUserId, serverUrl, channelId, searchTerm, intl]);

    const onTitlePress = useCallback(preventDoubleTap(() => {
        let title;
        switch (channelType) {
            case General.DM_CHANNEL:
                title = intl.formatMessage({id: 'screens.channel_info.dm', defaultMessage: 'Direct message info'});
                break;
            case General.GM_CHANNEL:
                title = intl.formatMessage({id: 'screens.channel_info.gm', defaultMessage: 'Group message info'});
                break;
            default:
                title = intl.formatMessage({id: 'screens.channel_info', defaultMessage: 'Channel info'});
                break;
        }

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
        showModal(Screens.CHANNEL_INFO, title, {channelId, closeButtonId}, options);
    }), [channelId, channelType, intl, theme]);

    const onChannelQuickAction = useCallback(() => {
        if (isTablet) {
            onTitlePress();
            return;
        }

        // When calls is enabled, we need space to move the "Copy Link" from a button to an option
        const items = callsAvailable && !isDMorGM ? 3 : 2;
        let height = CHANNEL_ACTIONS_OPTIONS_HEIGHT + SEPARATOR_HEIGHT + MARGIN + (items * ITEM_HEIGHT);
        if (Platform.OS === 'android') {
            height += BOTTOM_SHEET_ANDROID_OFFSET;
        }

        const renderContent = () => {
            return (
                <QuickActions
                    channelId={channelId}
                    callsEnabled={callsAvailable}
                    isDMorGM={isDMorGM}
                />
            );
        };

        bottomSheet({
            title: '',
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(1, height)],
            theme,
            closeButtonId: 'close-channel-quick-actions',
        });
    }, [channelId, isDMorGM, isTablet, onTitlePress, theme, callsAvailable]);

    const rightButtons: HeaderRightButton[] = useMemo(() => {
        const buttons: HeaderRightButton[] = [];
        if (channelType === General.DM_CHANNEL && currentUserId) {
            buttons.push({
                iconName: 'pencil-outline',
                onPress: onSetAlias,
                buttonType: 'opacity',
                testID: 'channel_header.set_alias.button',
            });
        }

        buttons.push({
            iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
            onPress: onChannelQuickAction,
            buttonType: 'opacity',
            testID: 'channel_header.channel_quick_actions.button',
        });

        return buttons;
    }, [channelType, currentUserId, onSetAlias, onChannelQuickAction]);

    let title = displayName;
    if (isOwnDirectMessage) {
        title = intl.formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    if (alias) {
        title = `${title} (${alias})`;
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
                    {isCustomStatusEnabled && Boolean(customStatus.emoji) &&
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
                            testID='channel_header.custom_status.custom_status_text'
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
                showBackButton={!isTablet || !isTabletView}
                subtitle={subtitle}
                subtitleCompanion={subtitleCompanion}
                title={title}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
            {isBookmarksEnabled && hasBookmarks && shouldRenderBookmarks &&
            <ChannelHeaderBookmarks
                canAddBookmarks={canAddBookmarks}
                channelId={channelId}
            />
            }
        </>
    );
};

export default ChannelHeader;
