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
import {goToCreateQuickChecklist, goToPlaybookRun, goToPlaybookRuns} from '@playbooks/screens/navigation';
import ChannelBanner from '@screens/channel/header/channel_banner';
import {bottomSheet, navigateBack, navigateToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTypeDMorGM} from '@utils/channel';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ChannelHeaderBookmarks from './bookmarks';
import QuickActions, {MARGIN, SEPARATOR_HEIGHT} from './quick_actions';

import type {NavigationButtonProps} from '@components/navigation_button';

type ChannelProps = {
    canAddBookmarks: boolean;
    channelId: string;
    channelType: ChannelType;
    currentUserId: string;
    customStatus?: UserCustomStatus;
    isBookmarksEnabled: boolean;
    isCustomStatusEnabled: boolean;
    isCustomStatusExpired: boolean;
    hasBookmarks: boolean;
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
    currentUserId,
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
        navigateBack();
    }, []);

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

        navigateToScreen(Screens.CHANNEL_INFO, {channelId, title});
    }), [channelId, channelType, intl]));

    const onChannelQuickAction = useCallback(() => {
        // When calls is enabled, we need space to move the "Copy Link" from a button to an option
        let items = 2;
        if (callsAvailable && !isDMorGM) {
            items += 1;
        }
        if (hasPlaybookRuns && !isDMorGM) {
            items += 1;
        }
        const height = CHANNEL_ACTIONS_OPTIONS_HEIGHT + SEPARATOR_HEIGHT + (2 * MARGIN) + (items * ITEM_HEIGHT);

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

        bottomSheet(renderContent, [1, height]);
    }, [callsAvailable, isDMorGM, hasPlaybookRuns, channelId]);

    const openPlaybooksRuns = useCallback(() => {
        // If no active runs, create a new one instead
        if (playbooksActiveRuns === 0) {
            goToCreateQuickChecklist(
                channelId,
                displayName,
                currentUserId,
                teamId,
            );
            return;
        }

        if (activeRunId) {
            goToPlaybookRun(activeRunId);
            return;
        }

        goToPlaybookRuns(channelId, displayName);
    }, [playbooksActiveRuns, activeRunId, channelId, displayName, currentUserId, teamId]);

    const rightButtons = useMemo(() => {
        const buttons: NavigationButtonProps[] = [];
        if (isPlaybooksEnabled && !isDMorGM) {
            buttons.push({
                iconName: 'product-playbooks',
                onPress: openPlaybooksRuns,
                count: playbooksActiveRuns || '+',
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
            testID: 'channel_header.channel_quick_actions.button',
        });

        return buttons;
    }, [isPlaybooksEnabled, playbooksActiveRuns, isDMorGM, onChannelQuickAction, openPlaybooksRuns]);

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
                await fetchPlaybookRunsForChannel(serverUrl, channelId);
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
