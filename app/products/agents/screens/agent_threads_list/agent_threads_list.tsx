// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, Platform, Pressable, RefreshControl} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {fetchAIBots} from '@agents/actions/remote/bots';
import {fetchAIThreads} from '@agents/actions/remote/threads';
import {LOCAL_AGENT_DISPLAY_NAME} from '@agents/local/constants';
import HistoryItem, {type HistoryListItem} from '@agents/screens/agent_threads_list/history_item';
import {goToAgentChat} from '@agents/screens/navigation';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type AiBotModel from '@agents/types/database/models/ai_bot';
import type AiThreadModel from '@agents/types/database/models/ai_thread';
import type LocalAgentConversationModel from '@agents/types/database/models/local_agent_conversation';

type Props = {
    threads: AiThreadModel[];
    bots: AiBotModel[];
    localConversations: LocalAgentConversationModel[];
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
    },
    headerContainer: {
        backgroundColor: theme.sidebarBg,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: 8,
    },
    headerLeft: {
        width: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    headerIconButton: {
        padding: 10,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: theme.sidebarText,
        ...typography('Heading', 300),
    },
    headerRight: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    mainContent: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 120,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        color: theme.centerChannelColor,
        marginBottom: 8,
        textAlign: 'center',
        ...typography('Body', 400, 'SemiBold'),
    },
    emptyDescription: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textAlign: 'center',
        ...typography('Body', 100),
    },
    errorText: {
        color: theme.errorTextColor,
        textAlign: 'center',
        ...typography('Body', 100),
    },
    listContent: {
        paddingVertical: 0,
    },
}));

const AgentThreadsList = ({
    threads,
    bots,
    localConversations,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const styles = getStyleSheet(theme);

    const initialLoadDone = useRef(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const botNameByChannelId = useMemo(() => {
        const map: Record<string, string> = {};
        for (const bot of bots) {
            if (bot.dmChannelId) {
                map[bot.dmChannelId] = bot.displayName;
            }
        }
        return map;
    }, [bots]);

    const historyItems = useMemo((): HistoryListItem[] => {
        const serverItems: HistoryListItem[] = threads.map((thread) => ({
            id: thread.id,
            title: thread.title,
            message: thread.message,
            updateAt: thread.updateAt,
            replyCount: thread.replyCount,
            botName: botNameByChannelId[thread.channelId],
            isLocal: false,
        }));

        const localItems: HistoryListItem[] = localConversations.map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            message: '',
            updateAt: conversation.updateAt,
            replyCount: 0,
            botName: LOCAL_AGENT_DISPLAY_NAME,
            isLocal: true,
        }));

        return [...serverItems, ...localItems].sort((a, b) => b.updateAt - a.updateAt);
    }, [threads, localConversations, botNameByChannelId]);

    const refreshData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        }

        const [botsResult, threadsResult] = await Promise.all([
            fetchAIBots(serverUrl),
            fetchAIThreads(serverUrl),
        ]);

        if (isRefresh) {
            setRefreshing(false);
        }

        if (botsResult.error && threadsResult.error && threads.length === 0 && localConversations.length === 0) {
            setError(intl.formatMessage({
                id: 'agents.threads_list.error_loading',
                defaultMessage: 'Failed to load conversations. Please try again.',
            }));
        } else {
            setError(null);
        }

        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            setLoading(false);
        }
    }, [serverUrl, intl, threads.length, localConversations.length]);

    useEffect(() => {
        if (threads.length > 0 || bots.length > 0 || localConversations.length > 0) {
            initialLoadDone.current = true;
            setLoading(false);
        }
        refreshData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

    const exit = useCallback(() => {
        navigateBack();
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENT_THREADS_LIST, exit);

    const handleRefresh = useCallback(() => {
        refreshData(true);
    }, [refreshData]);

    const handleItemPress = useCallback(async (item: HistoryListItem) => {
        if (item.isLocal) {
            await navigateBack();
            goToAgentChat({localConversationId: item.id});
            return;
        }

        await fetchAndSwitchToThread(serverUrl, item.id, false);
    }, [serverUrl]);

    const renderItem: ListRenderItem<HistoryListItem> = useCallback(({item}) => {
        return (
            <HistoryItem
                item={item}
                onPress={handleItemPress}
                theme={theme}
            />
        );
    }, [handleItemPress, theme]);

    const renderEmptyState = useCallback(() => {
        if (error) {
            return (
                <View style={styles.emptyContainer}>
                    <CompassIcon
                        name='alert-circle-outline'
                        size={64}
                        color={theme.errorTextColor}
                        style={styles.emptyIcon}
                    />
                    <FormattedText
                        id='agents.threads_list.error_title'
                        defaultMessage='Unable to load conversations'
                        style={[styles.emptyTitle, {color: theme.errorTextColor}]}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <CompassIcon
                    name='forum-outline'
                    size={64}
                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                    style={styles.emptyIcon}
                />
                <FormattedText
                    id='agents.threads_list.empty_title'
                    defaultMessage='No conversations yet'
                    style={styles.emptyTitle}
                />
                <FormattedText
                    id='agents.threads_list.empty_description'
                    defaultMessage='Your conversations with agents will appear here. Start a new conversation to get started.'
                    style={styles.emptyDescription}
                />
            </View>
        );
    }, [error, styles, theme]);

    if (loading && historyItems.length === 0) {
        return (
            <Loading
                containerStyle={styles.loadingContainer}
                size='large'
                color={theme.buttonBg}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.headerContainer, {paddingTop: insets.top}]}>
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Pressable
                            onPress={exit}
                            style={({pressed}) => [styles.headerIconButton, pressed && {opacity: 0.72}]}
                            testID='agent_threads_list.back_button'
                        >
                            <CompassIcon
                                name={Platform.select({android: 'arrow-left', ios: 'arrow-back-ios'})!}
                                size={20}
                                color={changeOpacity(theme.sidebarText, 0.56)}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.headerCenter}>
                        <FormattedText
                            id='agents.threads_list.title'
                            defaultMessage='Agent chat history'
                            style={styles.headerTitle}
                        />
                    </View>

                    <View style={styles.headerRight}>
                        <Pressable
                            onPress={exit}
                            style={({pressed}) => [styles.headerIconButton, pressed && {opacity: 0.72}]}
                            testID='agent_threads_list.new_chat_button'
                        >
                            <CompassIcon
                                name='plus'
                                size={20}
                                color={theme.sidebarText}
                            />
                        </Pressable>
                    </View>
                </View>
            </View>

            <View style={styles.mainContent}>
                <FlashList
                    data={historyItems}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[theme.buttonBg]}
                            tintColor={theme.buttonBg}
                        />
                    }
                    testID='agent_threads_list.flat_list'
                />
            </View>
        </View>
    );
};

export default AgentThreadsList;
