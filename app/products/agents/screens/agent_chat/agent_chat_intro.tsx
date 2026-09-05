// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Pressable, Text, View} from 'react-native';

import {createPost} from '@actions/remote/post';
import {fetchCustomPromptPins, fetchCustomPrompts, renderCustomPrompt} from '@agents/actions/remote/custom_prompts';
import AgentsIntroIllustration from '@agents/components/illustrations';
import {useCustomPrompts} from '@agents/hooks';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {getErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CustomPrompt} from '@agents/types/api';

type Props = {
    loading: boolean;
    error: string | null;
    channelId: string | null;
    botUsername?: string;
    onPostCreated: (postId: string) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    introContent: {
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    welcomeText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600),
    },
    descriptionText: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: theme.errorTextColor,
        textAlign: 'center',
        marginTop: 16,
        ...typography('Body', 100),
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    pill: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    pillText: {
        color: theme.linkColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

type PromptPillProps = {
    prompt: CustomPrompt;
    disabled: boolean;
    onPress: (prompt: CustomPrompt) => void;
};

const PromptPill = ({prompt, disabled, onPress}: PromptPillProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(prompt);
    }, [onPress, prompt]);

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={({pressed}) => [styles.pill, (pressed || disabled) && {opacity: 0.72}]}
            testID={`agents.chat.prompt_pill.${prompt.id}`}
        >
            <Text style={styles.pillText}>{prompt.name}</Text>
        </Pressable>
    );
};

const AgentChatIntro = ({loading, error, channelId, botUsername, onPostCreated}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const [executing, setExecuting] = useState(false);

    const {prompts, pinnedIds} = useCustomPrompts(serverUrl);

    // Refresh the ephemeral prompts cache when the intro appears. Failures
    // are non-fatal: the pill row simply stays hidden.
    useDidMount(() => {
        fetchCustomPrompts(serverUrl);
        fetchCustomPromptPins(serverUrl);
    });

    const pinnedPrompts = useMemo(
        () => prompts.filter((prompt) => pinnedIds.includes(prompt.id)),
        [prompts, pinnedIds],
    );

    // Render the prompt server-side, post it into the agent DM, and hand the
    // created post id up so the chat switches to the conversation thread.
    // No @mention prepend — the agent DM already notifies the agent.
    const handlePromptPress = useCallback(async (prompt: CustomPrompt) => {
        if (!channelId || executing) {
            return;
        }
        setExecuting(true);

        const {data: rendered, error: renderError} = await renderCustomPrompt(serverUrl, prompt.id, channelId, botUsername);
        if (renderError || !rendered) {
            setExecuting(false);
            Alert.alert(
                intl.formatMessage({id: 'agents.custom_prompts.error_title', defaultMessage: 'Unable to run prompt'}),
                getErrorMessage(renderError, intl),
            );
            return;
        }

        const {post, error: postError} = await createPost(serverUrl, {
            channel_id: channelId,
            message: rendered,
        });
        setExecuting(false);

        if (postError || !post) {
            Alert.alert(
                intl.formatMessage({id: 'agents.custom_prompts.error_title', defaultMessage: 'Unable to run prompt'}),
                getErrorMessage(postError, intl),
            );
            return;
        }

        onPostCreated(post.id);
    }, [serverUrl, channelId, botUsername, executing, intl, onPostCreated]);

    if (loading) {
        return (
            <Loading
                containerStyle={styles.loadingContainer}
                size='large'
                color={theme.buttonBg}
            />
        );
    }

    return (
        <View style={styles.introContent}>
            <AgentsIntroIllustration theme={theme}/>
            <FormattedText
                id='agents.chat.intro_title'
                defaultMessage='Ask Agents anything'
                style={styles.welcomeText}
            />
            <FormattedText
                id='agents.chat.intro_description'
                defaultMessage='Agents are here to help.'
                style={styles.descriptionText}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            {!error && pinnedPrompts.length > 0 && (
                <View style={styles.pillsContainer}>
                    {pinnedPrompts.map((prompt) => (
                        <PromptPill
                            key={prompt.id}
                            prompt={prompt}
                            disabled={executing || !channelId}
                            onPress={handlePromptPress}
                        />
                    ))}
                </View>
            )}
        </View>
    );

};

export default AgentChatIntro;
