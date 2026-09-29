// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, Pressable} from 'react-native';

import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type HistoryListItem = {
    id: string;
    title: string;
    message: string;
    updateAt: number;
    replyCount: number;
    botName?: string;
    isLocal: boolean;
};

type Props = {
    item: HistoryListItem;
    onPress: (item: HistoryListItem) => void;
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
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    threadTimestamp: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginLeft: 8,
        ...typography('Body', 50),
    },
    threadPreview: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    threadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    threadReplyCount: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingHorizontal: 8,
        paddingVertical: 4.5,
        ...typography('Body', 75, 'SemiBold'),
    },
    agentTag: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    agentTagText: {
        color: theme.centerChannelColor,
        textTransform: 'uppercase',
        letterSpacing: 0.2,
        ...typography('Body', 25, 'SemiBold'),
    },
}));

const HistoryItem = ({item, onPress, theme}: Props) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(item);
    }, [item, onPress]);

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [styles.threadItem, pressed && {opacity: 0.72}]}
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
                        value={item.updateAt}
                        style={styles.threadTimestamp}
                    />
                </View>
                {item.message ? (
                    <Text
                        style={styles.threadPreview}
                        numberOfLines={2}
                    >
                        {item.message}
                    </Text>
                ) : null}
                <View style={styles.threadMeta}>
                    {item.isLocal && (
                        <View style={styles.agentTag}>
                            <FormattedText
                                id='agents.threads_list.on_device'
                                defaultMessage='On device'
                                style={styles.agentTagText}
                            />
                        </View>
                    )}
                    {item.botName ? (
                        <View style={styles.agentTag}>
                            <Text style={styles.agentTagText}>{item.botName}</Text>
                        </View>
                    ) : null}
                    {item.isLocal === false && (
                        <FormattedText
                            id='agents.threads_list.reply_count'
                            defaultMessage='{count, plural, one {# reply} other {# replies}}'
                            values={{count: item.replyCount}}
                            style={styles.threadReplyCount}
                        />
                    )}
                </View>
            </View>
        </Pressable>
    );
};

export default HistoryItem;
