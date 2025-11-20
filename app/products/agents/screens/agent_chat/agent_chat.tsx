// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIBots, getBotDirectChannel, type LLMBot} from '@agents/actions/remote/bots';
import {goToAgentThreadsList} from '@agents/screens/navigation';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, TextInput, Text, TouchableOpacity, ActivityIndicator, Platform, ScrollView} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentUserId: string;
    currentTeamId: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.16),
        backgroundColor: theme.centerChannelBg,
    },
    threadListButton: {
        padding: 8,
        marginRight: 12,
    },
    botSelectorButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
    },
    botSelectorText: {
        flex: 1,
        fontSize: 16,
        color: theme.centerChannelColor,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.centerChannelColor,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginBottom: 24,
    },
    inputContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        backgroundColor: theme.centerChannelBg,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.centerChannelColor,
        maxHeight: 120,
        minHeight: 40,
        paddingTop: Platform.select({ios: 10, default: 8}),
        paddingBottom: Platform.select({ios: 10, default: 8}),
    },
    sendButton: {
        marginLeft: 8,
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: theme.errorTextColor,
        textAlign: 'center',
        marginTop: 16,
    },
}));

const AgentChat = ({
    componentId,
    currentUserId,
    currentTeamId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [bots, setBots] = useState<LLMBot[]>([]);
    const [selectedBot, setSelectedBot] = useState<LLMBot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const loadBots = async () => {
            setLoading(true);
            const {bots: fetchedBots, error: fetchError} = await fetchAIBots(serverUrl);
            setLoading(false);

            if (fetchError) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_loading_bots',
                    defaultMessage: 'Failed to load agents. Please try again.',
                }));
                return;
            }

            if (fetchedBots && fetchedBots.length > 0) {
                setBots(fetchedBots);
                setSelectedBot(fetchedBots[0]);
            } else {
                setError(intl.formatMessage({
                    id: 'agents.chat.no_bots',
                    defaultMessage: 'No agents available.',
                }));
            }
        };

        loadBots();
    }, [serverUrl, intl]);

    const exit = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, exit);

    const handleThreadListPress = useCallback(() => {
        goToAgentThreadsList(intl);
    }, [intl]);

    const handleBotSelectorPress = useCallback(() => {
        if (bots.length <= 1) {
            return;
        }

        // TODO: Implement bot selector bottom sheet
        // For now, just cycle through the available bots
        const currentIndex = bots.findIndex((b) => b.id === selectedBot?.id);
        const nextIndex = (currentIndex + 1) % bots.length;
        setSelectedBot(bots[nextIndex]);
    }, [bots, selectedBot]);

    const handleSend = useCallback(async () => {
        if (!message.trim() || !selectedBot || sending) {
            return;
        }

        setSending(true);

        // Get or create DM channel with the bot
        const {channelId, error: channelError} = await getBotDirectChannel(
            serverUrl,
            currentUserId,
            selectedBot.id,
        );

        if (channelError || !channelId) {
            setError(intl.formatMessage({
                id: 'agents.chat.error_creating_channel',
                defaultMessage: 'Failed to start conversation. Please try again.',
            }));
            setSending(false);
            return;
        }

        // Navigate to the channel
        await switchToChannelById(serverUrl, channelId, currentTeamId);

        // Clear message
        setMessage('');
        setSending(false);
    }, [message, selectedBot, sending, serverUrl, currentUserId, currentTeamId, intl]);

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
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleThreadListPress}
                    style={styles.threadListButton}
                    testID='agent_chat.thread_list_button'
                >
                    <CompassIcon
                        name='format-list-bulleted'
                        size={24}
                        color={theme.centerChannelColor}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleBotSelectorPress}
                    style={styles.botSelectorButton}
                    disabled={bots.length <= 1}
                    testID='agent_chat.bot_selector'
                >
                    <Text style={styles.botSelectorText}>
                        {selectedBot?.displayName || intl.formatMessage({
                            id: 'agents.chat.select_agent',
                            defaultMessage: 'Select an agent',
                        })}
                    </Text>
                    {bots.length > 1 && (
                        <CompassIcon
                            name='chevron-down'
                            size={18}
                            color={theme.centerChannelColor}
                        />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{flexGrow: 1}}
            >
                <Text style={styles.welcomeText}>
                    {intl.formatMessage({
                        id: 'agents.chat.welcome',
                        defaultMessage: 'Start a conversation with an agent',
                    })}
                </Text>
                <Text style={styles.descriptionText}>
                    {intl.formatMessage({
                        id: 'agents.chat.description',
                        defaultMessage: 'Type a message below to start a new conversation. You can view your past conversations by tapping the list icon above.',
                    })}
                </Text>
                {error && <Text style={styles.errorText}>{error}</Text>}
            </ScrollView>

            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={message}
                        onChangeText={setMessage}
                        placeholder={intl.formatMessage({
                            id: 'agents.chat.input_placeholder',
                            defaultMessage: 'Type a message...',
                        })}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                        multiline={true}
                        editable={!sending && Boolean(selectedBot)}
                        testID='agent_chat.input'
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        style={styles.sendButton}
                        disabled={!message.trim() || !selectedBot || sending}
                        testID='agent_chat.send_button'
                    >
                        {sending ? (
                            <ActivityIndicator
                                size='small'
                                color={theme.buttonBg}
                            />
                        ) : (
                            <CompassIcon
                                name='send'
                                size={24}
                                color={message.trim() && selectedBot ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.32)}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default AgentChat;
