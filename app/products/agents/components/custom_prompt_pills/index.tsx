// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, StyleSheet, View} from 'react-native';

import {fetchCustomPrompts, postCustomPrompt} from '@agents/actions/remote/custom_prompts';
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

    // Switching agents unmounts the pills; a prompt still in flight for the
    // previous agent's DM must not hand its post to the new conversation.
    const mountedRef = useRef(true);

    useDidMount(() => {
        fetchCustomPrompts(serverUrl);
        return () => {
            mountedRef.current = false;
        };
    });

    const pinnedPrompts = useMemo(() => {
        return prompts.filter((prompt) => pinnedPromptIds.includes(prompt.id));
    }, [prompts, pinnedPromptIds]);

    // executingId lags a render behind, so taps on two pills in the same frame
    // would both post without this.
    const executingRef = useRef(false);

    const handlePromptPress = useCallback(async (prompt: CustomPrompt) => {
        if (executingRef.current) {
            return;
        }
        executingRef.current = true;
        setExecutingId(prompt.id);

        const {postId, error} = await postCustomPrompt(serverUrl, prompt.id, channelId, botUsername);
        if (!mountedRef.current) {
            return;
        }
        executingRef.current = false;
        setExecutingId(null);

        if (error || !postId) {
            Alert.alert(
                intl.formatMessage(customPromptErrorMessages.errorTitle),
                intl.formatMessage(customPromptErrorMessages.errorMessage),
            );
            return;
        }

        onPostCreated(postId);
    }, [botUsername, channelId, intl, onPostCreated, serverUrl]);

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
