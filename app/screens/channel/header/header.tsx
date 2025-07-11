// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
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
import {usePreventDoubleTap} from '@hooks/utils';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {goToPlaybookRun, goToPlaybookRuns} from '@playbooks/screens/navigation';
import {BOTTOM_SHEET_ANDROID_OFFSET} from '@screens/bottom_sheet';
import ChannelBanner from '@screens/channel/header/channel_banner';
import {bottomSheet, popTopScreen, showModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTypeDMorGM} from '@utils/channel';
import {bottomSheetSnapPoint} from '@utils/helpers';
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
    teamId: string;
    callsEnabledInChannel: boolean;
    groupCallsAllowed: boolean;
    isTabletView?: boolean;
    shouldRenderBookmarks: boolean;
    shouldRenderChannelBanner: boolean;
    hasPlaybookRuns: boolean;
    playbooksActiveRuns: number;
    isPlaybooksEnabled: boolean;
    activeRunId?: string;

    // searchTerm: string;
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
    canAddBookmarks,
    channelId,
    channelType,
    componentId,
    customStatus,
    displayName,
    hasBookmarks,
    isBookmarksEnabled,
    isCustomStatusEnabled,
    isCustomStatusExpired,
    isOwnDirectMessage,
    memberCount,
    teamId,
    callsEnabledInChannel,
    groupCallsAllowed,
    isTabletView,
    shouldRenderBookmarks,
    shouldRenderChannelBanner,
    playbooksActiveRuns,
    hasPlaybookRuns,
    isPlaybooksEnabled,
    activeRunId,
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

    const onTitlePress = usePreventDoubleTap(useCallback((() => {
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
    }), [channelId, channelType, intl, theme]));

    const onChannelQuickAction = useCallback(() => {
        if (isTablet) {
            onTitlePress();
            return;
        }

        // When calls is enabled, we need space to move the "Copy Link" from a button to an option
        let items = 2;
        if (callsAvailable && !isDMorGM) {
            items += 1;
        }
        if (hasPlaybookRuns) {
            items += 1;
        }
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
                    hasPlaybookRuns={hasPlaybookRuns}
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
    }, [isTablet, callsAvailable, isDMorGM, hasPlaybookRuns, theme, onTitlePress, channelId]);

    const openPlaybooksRuns = useCallback(() => {
        if (activeRunId) {
            goToPlaybookRun(intl, activeRunId);
            return;
        }
        goToPlaybookRuns(intl, channelId, displayName);
    }, [activeRunId, channelId, displayName, intl]);

    const rightButtons = useMemo(() => {
        const buttons: HeaderRightButton[] = [];
        if (playbooksActiveRuns) {
            buttons.push({
                iconName: 'product-playbooks',
                onPress: openPlaybooksRuns,
                buttonType: 'opacity',
                count: playbooksActiveRuns,
            });
        }

        // {
        //     iconName: 'magnify',
        //     onPress: () => {
        //         DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {screen: 'Search', params: {searchTerm: `in: ${searchTerm}`}});
        //         if (!isTablet) {
        //             popTopScreen(componentId);
        //         }
        //     },
        // },
        buttons.push({
            iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
            onPress: onChannelQuickAction,
            buttonType: 'opacity',
            testID: 'channel_header.channel_quick_actions.button',
        });

        return buttons;
    }, [playbooksActiveRuns, onChannelQuickAction, openPlaybooksRuns]);

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
    }, [memberCount, customStatus, isCustomStatusExpired, theme.sidebarHeaderTextColor, styles.customStatusContainer, styles.customStatusEmoji, styles.customStatusText, styles.subtitle, isCustomStatusEnabled]);

    useEffect(() => {
        const asyncEffect = async () => {
            if (isPlaybooksEnabled && !EphemeralStore.getChannelPlaybooksSynced(serverUrl, channelId)) {
                const res = await fetchPlaybookRunsForChannel(serverUrl, channelId);
                if (!('error' in res)) {
                    EphemeralStore.setChannelPlaybooksSynced(serverUrl, channelId);
                }
            }
        };
        asyncEffect();
    }, [channelId, serverUrl, isPlaybooksEnabled]);

    const showBookmarkBar = isBookmarksEnabled && hasBookmarks && shouldRenderBookmarks;

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
            {showBookmarkBar &&
            <ChannelHeaderBookmarks
                canAddBookmarks={canAddBookmarks}
                channelId={channelId}
            />
            }
            {
                shouldRenderChannelBanner &&
                <ChannelBanner
                    channelId={channelId}
                    isTopItem={!showBookmarkBar}
                />
            }
        </>
    );
};

export default ChannelHeader;
