// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, StyleSheet, View} from 'react-native';

import {createPost} from '@actions/remote/post';
import {fetchCustomPrompts, renderCustomPrompt} from '@agents/actions/remote/custom_prompts';
import {useCustomPromptsState} from '@agents/store/custom_prompts_store';
import {useServerUrl} from '@context/server';
import useDidMount from '@hooks/did_mount';

import CustomPromptPill from './custom_prompt_pill';

import type {CustomPrompt} from '@agents/types/api';

// Shared with the composer prompt list, which surfaces the same failure.
export const customPromptErrorMessages = defineMessages({
    errorTitle: {
        id: 'agents.custom_prompts.error_title',
        defaultMessage: 'Unable to run prompt',
    },
    errorMessage: {
        id: 'agents.custom_prompts.error_message',
        defaultMessage: 'Something went wrong. Please try again.',
    },
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
});

type Props = {
    channelId: string;
    botUsername?: string;
    onPostCreated: (postId: string) => void;
};

/**
 * Pinned custom prompts as one-tap pills on the agent new-chat screen. A tap
 * renders the prompt server-side, posts the rendered text into the agent DM,
 * and hands the created post id back so the chat switches to the thread
 * (webapp parity: rhs_prompt_buttons.tsx).
 */
const CustomPromptPills = ({channelId, botUsername, onPostCreated}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const {prompts, pinnedPromptIds} = useCustomPromptsState(serverUrl);
    const [executingId, setExecutingId] = useState<string | null>(null);

    useDidMount(() => {
        fetchCustomPrompts(serverUrl);
    });

    const pinnedPrompts = useMemo(() => {
        return prompts.filter((prompt) => pinnedPromptIds.includes(prompt.id));
    }, [prompts, pinnedPromptIds]);

    const showError = useCallback(() => {
        Alert.alert(
            intl.formatMessage(customPromptErrorMessages.errorTitle),
            intl.formatMessage(customPromptErrorMessages.errorMessage),
        );
    }, [intl]);

    const handlePromptPress = useCallback(async (prompt: CustomPrompt) => {
        if (executingId) {
            return;
        }
        setExecutingId(prompt.id);

        // bot_username lets the server resolve {{.BotName}} for the selected agent.
        const {data: rendered, error: renderError} = await renderCustomPrompt(serverUrl, prompt.id, {
            channel_id: channelId,
            bot_username: botUsername,
        });

        if (renderError || rendered === undefined) {
            setExecutingId(null);
            showError();
            return;
        }

        const {post, error: postError} = await createPost(serverUrl, {channel_id: channelId, message: rendered});
        setExecutingId(null);

        if (postError || !post?.id) {
            showError();
            return;
        }

        onPostCreated(post.id);
    }, [botUsername, channelId, executingId, onPostCreated, serverUrl, showError]);

    if (pinnedPrompts.length === 0) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='agents.custom_prompts.pills'
        >
            {pinnedPrompts.map((prompt) => (
                <CustomPromptPill
                    key={prompt.id}
                    prompt={prompt}
                    executing={executingId === prompt.id}
                    disabled={executingId !== null}
                    onPress={handlePromptPress}
                />
            ))}
        </View>
    );
};

export default CustomPromptPills;
