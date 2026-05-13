// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PortalProvider} from '@gorhom/portal';
import {useIsFocused} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, StyleSheet} from 'react-native';
import {SafeAreaView, useSafeAreaInsets, type Edge} from 'react-native-safe-area-context';

import {createDirectChannel} from '@actions/remote/channel';
import {buildAbsoluteUrl} from '@actions/remote/file';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {buildProfileImageUrl} from '@actions/remote/user';
import {fetchAIBots} from '@agents/actions/remote/bots';
import BotSelectorItem from '@agents/screens/agent_chat/bot_selector_item';
import {goToAgentThreadsList} from '@agents/screens/navigation';
import {KeyboardAwarePostDraftContainer} from '@components/keyboard_aware_post_draft_container';
import PostDraft from '@components/post_draft';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {KeyboardStateProvider} from '@context/keyboard_state';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {usePreventDoubleTap} from '@hooks/utils';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet, dismissBottomSheet, navigateBack} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';

import AgentChatContent from './agent_chat_content';
import AgentChatHeader from './header';

import type AiBotModel from '@agents/types/database/models/ai_bot';

type Props = {
    bots: AiBotModel[];
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const AGENT_CHAT_TESTID = 'agent_chat.post_draft';

// This follows the same pattern as draft_input.tsx: `${testID}.post.input`
const AGENT_CHAT_INPUT_NATIVE_ID = `${AGENT_CHAT_TESTID}.post.input`;

const AgentChat = ({bots}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const isFocused = useIsFocused();
    const defaultHeight = useDefaultHeaderHeight();

    // Track if this is the first load
    const initialLoadDone = useRef(false);
    const [selectedBot, setSelectedBot] = useState<AiBotModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [channelId, setChannelId] = useState<string | null>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    const tabBarHeight = isTablet ? BOTTOM_TAB_HEIGHT : 0;
    const marginTop = defaultHeight + (isTablet ? 0 : -insets.top);

    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (isTablet) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet]);

    // Auto-select first bot when bots are loaded from database
    useEffect(() => {
        if (bots.length > 0 && !selectedBot) {
            setSelectedBot(bots[0]);
        }
    }, [bots, selectedBot]);

    // Refresh bots from network on mount
    useEffect(() => {
        const refreshBots = async () => {
            // If we have cached data, don't show loading spinner
            if (bots.length > 0) {
                initialLoadDone.current = true;
                setLoading(false);
            }

            const {error: fetchError} = await fetchAIBots(serverUrl);

            // Mark initial load as done
            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
                setLoading(false);
            }

            // Only show error if fetch failed AND we have no cached data
            if (fetchError && bots.length === 0) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_loading_bots',
                    defaultMessage: 'Failed to load agents. Please try again.',
                }));
            }
        };

        refreshBots();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

    // Show error if no bots after loading
    useEffect(() => {
        if (!loading && bots.length === 0 && !error) {
            setError(intl.formatMessage({
                id: 'agents.chat.no_bots',
                defaultMessage: 'No agents available.',
            }));
        } else if (bots.length > 0 && error) {
            // Clear error if we now have bots
            setError(null);
        }
    }, [loading, bots.length, error, intl]);

    // Get or create DM channel when bot is selected
    useEffect(() => {
        const getChannel = async () => {
            if (!selectedBot) {
                setChannelId(null);
                return;
            }

            const {data, error: channelError} = await createDirectChannel(
                serverUrl,
                selectedBot.id,
            );

            if (channelError || !data) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_creating_channel',
                    defaultMessage: 'Failed to start conversation. Please try again.',
                }));
                return;
            }

            setChannelId(data.id);
        };

        getChannel();
    }, [selectedBot, serverUrl, intl]);

    const exit = useCallback(() => {
        navigateBack();
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENT_CHAT, exit);

    const handleHistoryPress = useCallback(() => {
        goToAgentThreadsList();
    }, []);

    const handleBotSelect = useCallback((bot: AiBotModel) => {
        setSelectedBot(bot);
        dismissBottomSheet();
    }, []);

    const handleBotSelectorPress = usePreventDoubleTap(useCallback(() => {
        if (bots.length <= 1) {
            return;
        }

        const renderContent = () => {
            return (
                <>
                    {bots.map((bot) => {
                        const avatarUrl = buildAbsoluteUrl(
                            serverUrl,
                            buildProfileImageUrl(serverUrl, bot.id, bot.lastIconUpdate),
                        );

                        return (
                            <BotSelectorItem
                                key={bot.id}
                                bot={bot}
                                avatarUrl={avatarUrl}
                                isSelected={selectedBot?.id === bot.id}
                                onSelect={handleBotSelect}
                                theme={theme}
                            />
                        );
                    })}
                </>
            );
        };

        const snapPoint = bottomSheetSnapPoint(bots.length, ITEM_HEIGHT);
        bottomSheet(renderContent, [1, (snapPoint + TITLE_HEIGHT)]);
    }, [bots, serverUrl, selectedBot?.id, handleBotSelect, theme]));

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const handlePostCreated = useCallback((postId: string) => {
        fetchAndSwitchToThread(serverUrl, postId);
    }, [serverUrl]);

    return (
        <SafeAreaView
            edges={safeAreaViewEdges}
            style={styles.flex}
            testID='agents_chat.screen'
            onLayout={onLayout}
        >
            <AgentChatHeader
                title={intl.formatMessage({id: 'agents.chat.title', defaultMessage: 'Agents'})}
                subtitle={selectedBot ? selectedBot.displayName : intl.formatMessage({id: 'agents.chat.select_agent', defaultMessage: 'Select an agent'})}
                showSubtitleCompanion={bots.length > 1}
                onPress={handleBotSelectorPress}
                onHistoryPress={handleHistoryPress}
            />

            <KeyboardStateProvider
                tabBarHeight={tabBarHeight}
                enabled={isFocused}
            >
                <PortalProvider>
                    <KeyboardAwarePostDraftContainer
                        textInputNativeID={AGENT_CHAT_INPUT_NATIVE_ID}
                        containerStyle={[styles.flex, {marginTop}]}
                        renderList={() => (
                            <AgentChatContent
                                loading={loading && bots.length === 0}
                                error={error}
                            />
                        )}
                    >
                        <PostDraft
                            channelId={channelId}
                            testID={AGENT_CHAT_TESTID}
                            containerHeight={containerHeight}
                            isChannelScreen={false}
                            location={Screens.AGENT_CHAT}
                            onPostCreated={handlePostCreated}
                        />
                    </KeyboardAwarePostDraftContainer>
                </PortalProvider>
            </KeyboardStateProvider>
        </SafeAreaView>
    );
};

export default AgentChat;
