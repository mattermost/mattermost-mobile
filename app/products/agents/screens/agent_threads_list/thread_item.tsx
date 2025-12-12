// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {AIThread} from '@agents/types';

export const THREAD_ITEM_HEIGHT = 88;

type Props = {
    thread: AIThread;
    onPress: (thread: AIThread) => void;
    botName?: string;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    threadItem: {
        flexDirection: 'row',
        paddingLeft: 26,
        paddingRight: 20,
        paddingVertical: 16,
        backgroundColor: theme.centerChannelBg,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    threadContent: {
        flex: 1,
        gap: 6,
    },
    threadHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    threadTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: theme.centerChannelColor,
    },
    threadTimestamp: {
        fontSize: 11,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginLeft: 8,
    },
    threadPreview: {
        fontSize: 16,
        color: theme.centerChannelColor,
        lineHeight: 24,
    },
    threadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    threadReplyCount: {
        fontSize: 12,
        fontWeight: '600',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingHorizontal: 8,
        paddingVertical: 4.5,
    },
    agentTag: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    agentTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.centerChannelColor,
        textTransform: 'uppercase',
        letterSpacing: 0.2,
    },
}));

const ThreadItem = ({thread, onPress, botName, theme}: Props) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(thread);
    }, [thread, onPress]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.threadItem}
            testID={`agent_thread.${thread.id}`}
        >
            <View style={styles.threadContent}>
                <View style={styles.threadHeader}>
                    <Text
                        style={styles.threadTitle}
                        numberOfLines={1}
                    >
                        {thread.title || intl.formatMessage({
                            id: 'agents.threads_list.default_title',
                            defaultMessage: 'Conversation with Agents',
                        })}
                    </Text>
                    <FormattedRelativeTime
                        value={thread.update_at}
                        style={styles.threadTimestamp}
                    />
                </View>
                {thread.message && (
                    <Text
                        style={styles.threadPreview}
                        numberOfLines={2}
                    >
                        {thread.message}
                    </Text>
                )}
                <View style={styles.threadMeta}>
                    <CompassIcon
                        name='reply-outline'
                        size={14}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <Text style={styles.threadReplyCount}>
                        {`${thread.reply_count} ${thread.reply_count === 1 ? intl.formatMessage({
                            id: 'agents.threads_list.reply',
                            defaultMessage: 'reply',
                        }) : intl.formatMessage({
                            id: 'agents.threads_list.replies',
                            defaultMessage: 'replies',
                        })}`}
                    </Text>
                    {botName && (
                        <View style={styles.agentTag}>
                            <Text style={styles.agentTagText}>
                                {botName}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ThreadItem;
