// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableHighlight, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import FormattedText from '@components/formatted_text';
import FriendlyDate from '@components/friendly_date';
import RemoveMarkdown from '@components/remove_markdown';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {getMarkdownTextStyles} from '@utils/markdown';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import ThreadFooter from './thread_footer';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
    channel?: ChannelModel;
    location: string;
    post?: PostModel;
    teammateNameDisplay: string;
    testID: string;
    thread: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingTop: 12,
            paddingRight: 16,
            paddingBottom: 6,
            flex: 1,
            flexDirection: 'row',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
        },
        badgeContainer: {
            marginTop: 3,
            width: 26,
        },
        postContainer: {
            flex: 1,
        },
        header: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginBottom: 6,
        },
        headerInfoContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginRight: 12,
            overflow: 'hidden',
        },
        threadDeleted: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            fontStyle: 'italic',
        },
        threadStarter: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
            paddingRight: 6,
        },
        channelNameContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            maxWidth: '50%',
        },
        channelName: {
            color: theme.centerChannelColor,
            ...typography('Body', 25, 'SemiBold'),
            letterSpacing: 0.1,
            textTransform: 'uppercase',
            marginHorizontal: 6,
            marginVertical: 2,
        },
        date: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 50, 'Regular'),
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        unreadDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.sidebarTextActiveBorder,
            alignSelf: 'center',
            marginTop: 5,
        },
        mentionBadge: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.buttonBg,
            alignSelf: 'center',
        },
        mentionBadgeText: {
            ...typography('Body', 25, 'SemiBold'),
            alignSelf: 'center',
            color: theme.buttonColor,
        },
    };
});

const Thread = ({author, channel, location, post, teammateNameDisplay, testID, thread}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const serverUrl = useServerUrl();

    const [isChannelNamePressed, setIsChannelNamePressed] = useState<Boolean>(false);

    const channelNameStyle = useMemo(() => (
        [styles.channelName, isChannelNamePressed ? {color: theme.buttonBg} : null]
    ), [isChannelNamePressed, styles, theme]);

    const togglePressed = useCallback(() => {
        setIsChannelNamePressed((prevState) => !prevState);
    }, []);

    const showThread = useCallback(preventDoubleTap(() => {
        fetchAndSwitchToThread(serverUrl, thread.id);
    }), [serverUrl, thread.id]);

    const onChannelNamePressed = useCallback(() => {
        if (channel?.id) {
            switchToChannelById(serverUrl, channel?.id);
        }
    }, [serverUrl, channel?.id]);

    const showThreadOptions = useCallback(() => {
        const passProps = {thread};
        const title = isTablet ? intl.formatMessage({id: 'thread.options.title', defaultMessage: 'Thread Actions'}) : '';

        if (isTablet) {
            showModal(Screens.THREAD_OPTIONS, title, passProps, bottomSheetModalOptions(theme, 'close-thread-options'));
        } else {
            showModalOverCurrentContext(Screens.THREAD_OPTIONS, passProps);
        }
    }, [isTablet, theme, thread]);

    if (!post || !channel) {
        return null;
    }

    const threadStarterName = displayUsername(author, intl.locale, teammateNameDisplay);
    const threadItemTestId = `${testID}.thread_item.${thread.id}`;

    const needBadge = thread.unreadMentions || thread.unreadReplies;
    let badgeComponent;
    if (needBadge) {
        if (thread.unreadMentions) {
            badgeComponent = (
                <View
                    style={styles.mentionBadge}
                    testID={`${threadItemTestId}.unread_mentions.badge`}
                >
                    <Text style={styles.mentionBadgeText}>{thread.unreadMentions > 99 ? '99+' : thread.unreadMentions}</Text>
                </View>
            );
        } else if (thread.unreadReplies) {
            badgeComponent = (
                <View
                    style={styles.unreadDot}
                    testID={`${threadItemTestId}.unread_dot.badge`}
                />
            );
        }
    }

    let name;
    let postBody;
    if (!post || post.deleteAt > 0) {
        name = (
            <FormattedText
                id='threads.deleted'
                defaultMessage='Original Message Deleted'
                style={[styles.threadStarter, styles.threadDeleted]}
                numberOfLines={1}
                testID={`${threadItemTestId}.thread_starter.user_display_name`}
            />
        );
    } else {
        name = (
            <Text
                style={styles.threadStarter}
                numberOfLines={1}
                testID={`${threadItemTestId}.thread_starter.user_display_name`}
            >
                {threadStarterName}
            </Text>
        );
        if (post?.message) {
            postBody = (
                <Text numberOfLines={2}>
                    <RemoveMarkdown
                        enableCodeSpan={true}
                        enableEmoji={true}
                        enableHardBreak={true}
                        enableSoftBreak={true}
                        textStyle={textStyles}
                        baseStyle={styles.message}
                        value={post.message.substring(0, 100)} // This substring helps to avoid ANR's
                    />
                </Text>
            );
        }
    }

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            onLongPress={showThreadOptions}
            onPress={showThread}
            testID={threadItemTestId}
        >
            <View style={styles.container}>
                <View style={styles.badgeContainer}>
                    {badgeComponent}
                </View>
                <View style={styles.postContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerInfoContainer}>
                            {name}
                            {threadStarterName !== channel?.displayName && (
                                <View style={styles.channelNameContainer}>
                                    <TouchableWithFeedback
                                        onPress={onChannelNamePressed}
                                        type={'native'}
                                        underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                                        onPressIn={togglePressed}
                                        onPressOut={togglePressed}
                                    >
                                        <Text
                                            style={channelNameStyle}
                                            numberOfLines={1}
                                            testID={`${threadItemTestId}.thread_starter.channel_display_name`}
                                        >
                                            {channel?.displayName}
                                        </Text>
                                    </TouchableWithFeedback>
                                </View>
                            )}
                        </View>
                        <FriendlyDate
                            value={thread.lastReplyAt}
                            style={styles.date}
                        />
                    </View>
                    {postBody}
                    {Boolean(post && thread) &&
                    <ThreadFooter
                        author={author}
                        channelId={post!.channelId}
                        location={location}
                        testID={`${threadItemTestId}.footer`}
                        thread={thread}
                    />
                    }
                </View>
            </View>
        </TouchableHighlight>
    );
};

export default Thread;
