// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIThreads} from '@agents/actions/remote/threads';
import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, RefreshControl, ActivityIndicator} from 'react-native';

import {fetchAndSwitchToThread} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {AIThread} from '@agents/types';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
};

const THREAD_ITEM_HEIGHT = 88;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.centerChannelColor,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textAlign: 'center',
        lineHeight: 20,
    },
    threadItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: theme.centerChannelBg,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    threadContent: {
        flex: 1,
    },
    threadHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    threadTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: theme.centerChannelColor,
    },
    threadTimestamp: {
        fontSize: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginLeft: 8,
    },
    threadPreview: {
        fontSize: 14,
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginBottom: 4,
    },
    threadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    threadReplyCount: {
        fontSize: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    errorText: {
        fontSize: 14,
        color: theme.errorTextColor,
        textAlign: 'center',
    },
    listContent: {
        paddingVertical: 8,
    },
}));

const AgentThreadsList = ({
    componentId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [threads, setThreads] = useState<AIThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadThreads = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        const {threads: fetchedThreads, error: fetchError} = await fetchAIThreads(serverUrl);

        if (isRefresh) {
            setRefreshing(false);
        } else {
            setLoading(false);
        }

        if (fetchError) {
            setError(intl.formatMessage({
                id: 'agents.threads_list.error_loading',
                defaultMessage: 'Failed to load conversations. Please try again.',
            }));
            return;
        }

        if (fetchedThreads) {
            // Sort by most recent first
            const sortedThreads = fetchedThreads.sort((a, b) => b.update_at - a.update_at);
            setThreads(sortedThreads);
            setError(null);
        }
    }, [serverUrl, intl]);

    useEffect(() => {
        loadThreads();
    }, [loadThreads]);

    const exit = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, exit);

    const handleRefresh = useCallback(() => {
        loadThreads(true);
    }, [loadThreads]);

    const handleThreadPress = useCallback(async (thread: AIThread) => {
        // Navigate to the thread
        await fetchAndSwitchToThread(serverUrl, thread.id, false);

        // fetchAndSwitchToThread handles navigation, so we don't need to exit
    }, [serverUrl]);

    const renderItem: ListRenderItem<AIThread> = useCallback(({item}) => {
        return (
            <TouchableOpacity
                onPress={() => handleThreadPress(item)}
                style={styles.threadItem}
                testID={`agent_thread.${item.id}`}
            >
                <View style={styles.threadContent}>
                    <View style={styles.threadHeader}>
                        <Text
                            style={styles.threadTitle}
                            numberOfLines={1}
                        >
                            {item.title || intl.formatMessage({
                                id: 'agents.threads_list.default_title',
                                defaultMessage: 'Conversation with Agents',
                            })}
                        </Text>
                        <FormattedRelativeTime
                            value={item.update_at}
                            style={styles.threadTimestamp}
                        />
                    </View>
                    {item.message && (
                        <Text
                            style={styles.threadPreview}
                            numberOfLines={2}
                        >
                            {item.message}
                        </Text>
                    )}
                    <View style={styles.threadMeta}>
                        <CompassIcon
                            name='reply-outline'
                            size={14}
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                        />
                        <Text style={styles.threadReplyCount}>
                            {` ${item.reply_count} ${item.reply_count === 1 ? intl.formatMessage({
                                id: 'agents.threads_list.reply',
                                defaultMessage: 'reply',
                            }) : intl.formatMessage({
                                id: 'agents.threads_list.replies',
                                defaultMessage: 'replies',
                            })}`}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [handleThreadPress, intl, styles, theme]);

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
                    <Text style={[styles.emptyTitle, {color: theme.errorTextColor}]}>
                        {intl.formatMessage({
                            id: 'agents.threads_list.error_title',
                            defaultMessage: 'Unable to load conversations',
                        })}
                    </Text>
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
                <Text style={styles.emptyTitle}>
                    {intl.formatMessage({
                        id: 'agents.threads_list.empty_title',
                        defaultMessage: 'No conversations yet',
                    })}
                </Text>
                <Text style={styles.emptyDescription}>
                    {intl.formatMessage({
                        id: 'agents.threads_list.empty_description',
                        defaultMessage: 'Your conversations with agents will appear here. Start a new conversation to get started.',
                    })}
                </Text>
            </View>
        );
    }, [error, intl, styles, theme]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator
                    size='large'
                    color={theme.buttonBg}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlashList
                data={threads}
                renderItem={renderItem}
                estimatedItemSize={THREAD_ITEM_HEIGHT}
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
    );
};

export default AgentThreadsList;
