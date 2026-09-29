// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PortalHost} from '@gorhom/portal';
import {useIsFocused} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, StyleSheet} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {SafeAreaView, useSafeAreaInsets, type Edge} from 'react-native-safe-area-context';

import {createDirectChannel} from '@actions/remote/channel';
import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrl} from '@actions/remote/user';
import {fetchAIBots} from '@agents/actions/remote/bots';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {
    LOCAL_AGENT_DISPLAY_NAME,
    LOCAL_AGENT_ID,
} from '@agents/local/constants';
import {isLocalAgentAvailable} from '@agents/local/engine';
import AgentChatPostList from '@agents/screens/agent_chat/agent_chat_post_list';
import BotSelectorItem, {type AgentSelectorItem} from '@agents/screens/agent_chat/bot_selector_item';
import LocalAgentChat from '@agents/screens/agent_chat/local/local_agent_chat';
import {goToAgentThreadsList} from '@agents/screens/navigation';
import {resolveSelectedAgent} from '@agents/utils';
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
import {usePropsFromParams} from '@hooks/props_from_params';
import {usePreventDoubleTap} from '@hooks/utils';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet, dismissBottomSheet, navigateBack} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {logError} from '@utils/log';

import AgentChatContent from './agent_chat_content';
import AgentChatHeader from './header';

import type AiBotModel from '@agents/types/database/models/ai_bot';

type Props = {
    bots: AiBotModel[];
    selectedAgentId: string;
};

type RouteParams = {
    localConversationId?: string;
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const AGENT_CHAT_TESTID = 'agent_chat.post_draft';
const AGENT_CHAT_INPUT_NATIVE_ID = `${AGENT_CHAT_TESTID}.post.input`;
const PORTAL_NAME = 'agent_chat_autocomplete';

const LOCAL_AGENT_ITEM: AgentSelectorItem = {
    id: LOCAL_AGENT_ID,
    displayName: LOCAL_AGENT_DISPLAY_NAME,
    isLocal: true,
};

const AgentChat = ({bots, selectedAgentId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const isFocused = useIsFocused();
    const defaultHeight = useDefaultHeaderHeight();
    const {localConversationId: localConversationIdParam} = usePropsFromParams<RouteParams>();

    const localAvailable = isLocalAgentAvailable();
    const initialLoadDone = useRef(false);
    const [selectedBotId, setSelectedBotId] = useState<string | null>(
        localConversationIdParam ? LOCAL_AGENT_ID : null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [channelId, setChannelId] = useState<string | null>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const [rootId, setRootId] = useState<string | null>(null);
    const [localConversationId, setLocalConversationId] = useState<string | null>(
        localConversationIdParam ?? null,
    );

    const tabBarHeight = isTablet ? BOTTOM_TAB_HEIGHT : 0;
    const marginTop = defaultHeight + (isTablet ? 0 : -insets.top);

    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (isTablet) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet]);

    const selectorItems = useMemo((): AgentSelectorItem[] => {
        const serverItems = bots.map((bot) => ({
            id: bot.id,
            displayName: bot.displayName,
            avatarUrl: buildAbsoluteUrl(
                serverUrl,
                buildProfileImageUrl(serverUrl, bot.id, bot.lastIconUpdate),
            ),
            isLocal: false,
        }));

        if (localAvailable) {
            return [LOCAL_AGENT_ITEM, ...serverItems];
        }
        return serverItems;
    }, [bots, localAvailable, serverUrl]);

    const selectedItem = useMemo(() => {
        return selectorItems.find((item) => item.id === selectedBotId) ?? null;
    }, [selectorItems, selectedBotId]);

    const isLocalSelected = selectedItem?.isLocal === true;

    useEffect(() => {
        if (localConversationIdParam) {
            setSelectedBotId(LOCAL_AGENT_ID);
            setLocalConversationId(localConversationIdParam);
            setChannelId(null);
            setRootId(null);
        }
    }, [localConversationIdParam]);

    // Auto-resolve the selected bot when nothing is selected yet.
    useEffect(() => {
        if (selectedBotId || selectorItems.length === 0) {
            return;
        }

        if (localAvailable && bots.length === 0) {
            setSelectedBotId(LOCAL_AGENT_ID);
            return;
        }

        const resolved = resolveSelectedAgent(bots, selectedAgentId);
        setSelectedBotId(resolved?.id ?? (localAvailable ? LOCAL_AGENT_ID : null));
    }, [bots, selectedAgentId, selectedBotId, selectorItems.length, localAvailable]);

    useEffect(() => {
        const refreshBots = async () => {
            if (bots.length > 0 || localAvailable) {
                initialLoadDone.current = true;
                setLoading(false);
            }

            const {error: fetchError} = await fetchAIBots(serverUrl);

            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
                setLoading(false);
            }

            if (fetchError && bots.length === 0 && !localAvailable) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_loading_bots',
                    defaultMessage: 'Failed to load agents. Please try again.',
                }));
            }
        };

        refreshBots();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

    useEffect(() => {
        if (!loading && selectorItems.length === 0 && !error) {
            setError(intl.formatMessage({
                id: 'agents.chat.no_bots',
                defaultMessage: 'No agents available.',
            }));
        } else if (selectorItems.length > 0 && error) {
            setError(null);
        }
    }, [loading, selectorItems.length, error, intl]);

    useEffect(() => {
        const getChannel = async () => {
            if (!selectedItem || selectedItem.isLocal) {
                setChannelId(null);
                return;
            }

            const {data, error: channelError} = await createDirectChannel(
                serverUrl,
                selectedItem.id,
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
    }, [selectedItem, serverUrl, intl]);

    const exit = useCallback(() => {
        navigateBack();
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENT_CHAT, exit);

    const handleHistoryPress = useCallback(() => {
        goToAgentThreadsList();
    }, []);

    const handleBotSelect = useCallback(async (bot: AgentSelectorItem) => {
        setSelectedBotId(bot.id);
        setRootId(null);
        setChannelId(null);
        setLocalConversationId(null);
        dismissBottomSheet();

        if (bot.isLocal) {
            return;
        }

        const {error: saveError} = await saveSelectedAgent(serverUrl, bot.id);
        if (saveError) {
            logError('Failed to persist agent selection', getFullErrorMessage(saveError));
        }
    }, [serverUrl]);

    const handleBotSelectorPress = usePreventDoubleTap(useCallback(() => {
        if (selectorItems.length <= 1) {
            return;
        }

        const renderContent = () => {
            return (
                <>
                    {selectorItems.map((bot) => {
                        return (
                            <BotSelectorItem
                                key={bot.id}
                                bot={bot}
                                isSelected={selectedBotId === bot.id}
                                onSelect={handleBotSelect}
                                theme={theme}
                            />
                        );
                    })}
                </>
            );
        };

        const snapPoint = bottomSheetSnapPoint(selectorItems.length, ITEM_HEIGHT);
        bottomSheet(renderContent, [1, (snapPoint + TITLE_HEIGHT)]);
    }, [selectorItems, selectedBotId, handleBotSelect, theme]));

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const handlePostCreated = useCallback((postId: string) => {
        setRootId((current) => current ?? postId);
    }, []);

    const handleLocalConversationCreated = useCallback((id: string) => {
        setLocalConversationId(id);
    }, []);

    const subtitle = selectedItem?.displayName || intl.formatMessage({
        id: 'agents.chat.select_agent',
        defaultMessage: 'Select an agent',
    });

    return (
        <SafeAreaView
            edges={safeAreaViewEdges}
            style={styles.flex}
            testID='agents_chat.screen'
            onLayout={onLayout}
        >
            <AgentChatHeader
                title={intl.formatMessage({id: 'agents.chat.title', defaultMessage: 'Agents'})}
                subtitle={subtitle}
                showSubtitleCompanion={selectorItems.length > 1}
                onPress={handleBotSelectorPress}
                onHistoryPress={handleHistoryPress}
            />

            <KeyboardStateProvider
                tabBarHeight={tabBarHeight}
                enabled={isFocused}
            >
                {isLocalSelected ? (
                    <KeyboardAvoidingView
                        behavior='padding'
                        automaticOffset={true}
                        style={[styles.flex, {marginTop: defaultHeight}]}
                    >
                        <LocalAgentChat
                            conversationId={localConversationId}
                            onConversationCreated={handleLocalConversationCreated}
                        />
                    </KeyboardAvoidingView>
                ) : (
                    <KeyboardAwarePostDraftContainer
                        textInputNativeID={AGENT_CHAT_INPUT_NATIVE_ID}
                        containerStyle={[styles.flex, {marginTop}]}
                        renderList={() => (rootId ? (
                            <AgentChatPostList rootId={rootId}/>
                        ) : (
                            <AgentChatContent
                                loading={loading && bots.length === 0 && !localAvailable}
                                error={error}
                            />
                        ))}
                    >
                        {channelId ? (
                            <PostDraft
                                channelId={channelId}
                                rootId={rootId ?? undefined}
                                testID={AGENT_CHAT_TESTID}
                                containerHeight={containerHeight}
                                isChannelScreen={false}
                                location={Screens.AGENT_CHAT}
                                onPostCreated={handlePostCreated}
                                portalName={PORTAL_NAME}
                            />
                        ) : null}
                    </KeyboardAwarePostDraftContainer>
                )}
                <PortalHost name={PORTAL_NAME}/>
            </KeyboardStateProvider>
        </SafeAreaView>
    );
};

export default AgentChat;
