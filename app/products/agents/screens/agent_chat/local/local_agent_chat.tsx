// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {ActivityIndicator, FlatList, type ListRenderItem, Text, View} from 'react-native';

import {createLocalConversation} from '@agents/actions/local/local_agent';
import {observeLocalMessages} from '@agents/database/queries/local_agent';
import {LocalAgentMessageRole, LocalAgentMessageStatus} from '@agents/local/constants';
import {getLocalAgentEngine, isLocalAgentAvailable} from '@agents/local/engine';
import {runLocalAgentTurn, type PriorTurn} from '@agents/local/orchestrator';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {observeCurrentUser} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import LocalAgentInput from './local_agent_input';
import LocalMessageItem from './local_message_item';

import type {ToolCall} from '@agents/types';
import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    conversationId?: string | null;
    onConversationCreated?: (conversationId: string) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    loadingText: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textAlign: 'center',
        ...typography('Body', 100),
    },
    errorText: {
        color: theme.errorTextColor,
        textAlign: 'center',
        ...typography('Body', 100),
    },
    emptyTitle: {
        color: theme.centerChannelColor,
        textAlign: 'center',
        ...typography('Heading', 300),
    },
    emptyDescription: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textAlign: 'center',
        ...typography('Body', 100),
    },
    listContent: {
        paddingVertical: 8,
    },
}));

const keyExtractor = (item: LocalAgentMessageModel) => item.id;

function toPriorTurn(message: LocalAgentMessageModel): PriorTurn {
    if (message.role === LocalAgentMessageRole.User) {
        return {role: 'user', message: message.message};
    }

    const parsed = message.toolCalls ? safeParseJSON(message.toolCalls) : undefined;
    const toolCalls = Array.isArray(parsed) ? (parsed as ToolCall[]).map((tool) => ({name: tool.name, arguments: tool.arguments})) : undefined;
    return {role: 'assistant', message: message.message, toolCalls};
}

const LocalAgentChat = ({
    conversationId: conversationIdProp,
    onConversationCreated,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [conversationId, setConversationId] = useState<string | null>(conversationIdProp ?? null);
    const [messages, setMessages] = useState<LocalAgentMessageModel[]>([]);
    const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
    const [modelReady, setModelReady] = useState(false);
    const [modelLoading, setModelLoading] = useState(true);
    const [modelError, setModelError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (conversationIdProp) {
            setConversationId(conversationIdProp);
        }
    }, [conversationIdProp]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!isLocalAgentAvailable()) {
                if (!cancelled) {
                    setModelLoading(false);
                    setModelError(intl.formatMessage({
                        id: 'agents.local.model_missing',
                        defaultMessage: 'The on-device model is not bundled with this build.',
                    }));
                }
                return;
            }

            try {
                setModelLoading(true);
                await getLocalAgentEngine();
                if (!cancelled) {
                    setModelReady(true);
                    setModelError(null);
                }
            } catch (error) {
                logError('error on LocalAgentChat.loadModel', getFullErrorMessage(error));
                if (!cancelled) {
                    setModelError(intl.formatMessage({
                        id: 'agents.local.model_load_failed',
                        defaultMessage: 'Failed to load the on-device model.',
                    }));
                }
            } finally {
                if (!cancelled) {
                    setModelLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
            abortRef.current?.abort();
        };
    }, [intl]);

    useEffect(() => {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const subscription = observeCurrentUser(database).subscribe(setCurrentUser);
            return () => subscription.unsubscribe();
        } catch (error) {
            logDebug('LocalAgentChat: failed to observe current user');
            return undefined;
        }
    }, [serverUrl]);

    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            return undefined;
        }

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const subscription = observeLocalMessages(database, conversationId).subscribe(setMessages);
            return () => subscription.unsubscribe();
        } catch (error) {
            logError('error on LocalAgentChat.observeMessages', getFullErrorMessage(error));
            return undefined;
        }
    }, [serverUrl, conversationId]);

    // Inverted list keeps the newest message and the streaming reply pinned above the input.
    const newestFirstMessages = useMemo(() => [...messages].reverse(), [messages]);

    const priorTurns = useMemo(() => {
        return messages.
            filter((message) => message.status === LocalAgentMessageStatus.Complete).
            map(toPriorTurn);
    }, [messages]);

    const ensureConversation = useCallback(async () => {
        if (conversationId) {
            return conversationId;
        }

        const {data, error} = await createLocalConversation(serverUrl);
        if (error || !data) {
            throw error || new Error('Failed to create conversation');
        }

        setConversationId(data.id);
        onConversationCreated?.(data.id);
        return data.id;
    }, [conversationId, serverUrl, onConversationCreated]);

    const handleSend = useCallback(async (text: string) => {
        if (!modelReady || isGenerating) {
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        setIsGenerating(true);

        try {
            const id = await ensureConversation();
            const {error} = await runLocalAgentTurn({
                serverUrl,
                conversationId: id,
                userMessage: text,
                priorTurns,
                signal: controller.signal,
            });
            if (error) {
                logDebug('LocalAgentChat: turn returned error');
            }
        } catch (error) {
            logError('error on LocalAgentChat.handleSend', getFullErrorMessage(error));
        } finally {
            setIsGenerating(false);
            abortRef.current = null;
        }
    }, [modelReady, isGenerating, ensureConversation, serverUrl, priorTurns]);

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    const renderItem: ListRenderItem<LocalAgentMessageModel> = useCallback(({item}) => {
        return (
            <LocalMessageItem
                message={item}
                currentUsername={currentUser?.username}
            />
        );
    }, [currentUser?.username]);

    if (modelLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.buttonBg}/>
                    <FormattedText
                        id='agents.local.loading_model'
                        defaultMessage='Loading Gemma on this device…'
                        style={styles.loadingText}
                    />
                </View>
            </View>
        );
    }

    if (modelError) {
        return (
            <View style={styles.container}>
                <View style={styles.centered}>
                    <Text style={styles.errorText}>{modelError}</Text>
                </View>
            </View>
        );
    }

    return (
        <View
            style={styles.container}
            testID='agent_chat.local'
        >
            {messages.length === 0 ? (
                <View style={styles.centered}>
                    <FormattedText
                        id='agents.local.empty_title'
                        defaultMessage='Chat with Gemma'
                        style={styles.emptyTitle}
                    />
                    <FormattedText
                        id='agents.local.empty_description'
                        defaultMessage='Ask about channels and people from messages stored on this device. Try “Summarize the recent posts in town square”.'
                        style={styles.emptyDescription}
                    />
                </View>
            ) : (
                <FlatList
                    data={newestFirstMessages}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    inverted={true}
                    keyboardDismissMode='interactive'
                    contentContainerStyle={styles.listContent}
                    testID='agent_chat.local_message_list'
                />
            )}
            <LocalAgentInput
                disabled={!modelReady}
                isGenerating={isGenerating}
                onSend={handleSend}
                onStop={handleStop}
            />
        </View>
    );
};

export default LocalAgentChat;
