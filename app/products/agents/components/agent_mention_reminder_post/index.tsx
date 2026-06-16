// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {loopInAgent} from '@agents/actions/remote/loop_in_agent';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';

type LoopInStatus = 'idle' | 'pending' | 'done' | 'error';

const messages = defineMessages({
    link: {
        id: 'agents.agent_mention_reminder_link',
        defaultMessage: 'click here to loop in @{botDisplayName}',
    },
    done: {
        id: 'agents.agent_mention_reminder_done',
        defaultMessage: 'Looped in @{botDisplayName}.',
    },
    error: {
        id: 'agents.agent_mention_reminder_error',
        defaultMessage: 'Failed to loop in @{botDisplayName}. Please try again.',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        hint: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        link: {
            color: theme.linkColor,
            textDecorationLine: 'underline',
            ...typography('Body', 75),
        },
        linkPending: {
            opacity: 0.6,
        },
        errorText: {
            color: theme.errorTextColor,
            marginTop: 4,
            ...typography('Body', 75),
        },
    };
});

interface Props {
    post: PostModel;
}

/**
 * Renders a custom_agent_mention_reminder post: an interactive hint that lets
 * the user loop an agent into a thread it was @mentioned in. Mirrors the
 * webapp AgentMentionReminderPost.
 */
const AgentMentionReminderPost = ({post}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const props = post.props as Record<string, unknown> | undefined;
    const botUsername = (props?.bot_username as string) ?? '';
    const rawDisplayName = (props?.bot_display_name as string)?.trim();
    const botDisplayName = rawDisplayName || botUsername;
    const targetPostId = (props?.target_post_id as string) || post.id;

    const [status, setStatus] = useState<LoopInStatus>('idle');
    const pending = status === 'pending';

    const onPress = usePreventDoubleTap(useCallback(async () => {
        if (pending || status === 'done' || !botUsername || !targetPostId) {
            return;
        }
        setStatus('pending');
        const {error} = await loopInAgent(serverUrl, targetPostId, botUsername);
        setStatus(error ? 'error' : 'done');
    }, [pending, status, botUsername, targetPostId, serverUrl]));

    // Without a bot username the server sent a plain reminder; render its text.
    if (!botUsername) {
        return (
            <Text style={styles.hint}>{post.message}</Text>
        );
    }

    if (status === 'done') {
        return (
            <View testID='agents.agent_mention_reminder_post'>
                <Text style={styles.hint}>{intl.formatMessage(messages.done, {botDisplayName})}</Text>
            </View>
        );
    }

    return (
        <View testID='agents.agent_mention_reminder_post'>
            <Text style={styles.hint}>
                <FormattedText
                    id='agents.agent_mention_reminder_prefix'
                    defaultMessage='To respond to an agent you must @mention them. '
                    style={styles.hint}
                />
                <Text
                    onPress={pending ? undefined : onPress}
                    style={[styles.link, pending && styles.linkPending]}
                    testID='agents.agent_mention_reminder_post.loop_in_link'
                >
                    {intl.formatMessage(messages.link, {botDisplayName})}
                </Text>
            </Text>
            {status === 'error' && (
                <Text style={styles.errorText}>{intl.formatMessage(messages.error, {botDisplayName})}</Text>
            )}
        </View>
    );
};

export default AgentMentionReminderPost;
