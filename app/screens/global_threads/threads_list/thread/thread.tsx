// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableHighlight, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import FriendlyDate from '@components/friendly_date';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

import ThreadFooter from './thread_footer';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author: UserModel;
    channel: ChannelModel | undefined;
    currentUserId: string;
    participants: UserModel[];
    post: PostModel;
    teammateNameDisplay: string;
    testID: string;
    theme: Theme;
    thread: ThreadModel;
};

const Thread = ({author, channel, currentUserId, participants, post, teammateNameDisplay, testID, theme, thread}: Props) => {
    const style = getStyleSheet(theme);

    const threadStarterName = displayUsername(author, undefined, teammateNameDisplay);

    const showThread = () => {
        //@todo
    };

    const showThreadOptions = () => {
        //@todo
    };

    const testIDPrefix = `${testID}.${thread.id}`;

    const needBadge = thread.unreadMentions || thread.unreadReplies;
    let badgeComponent;
    if (needBadge) {
        if (thread.unreadMentions && thread.unreadMentions > 0) {
            badgeComponent = (
                <View
                    style={style.mentionBadge}
                    testID={`${testIDPrefix}.unread_mentions`}
                >
                    <Text style={style.mentionBadgeText}>{thread.unreadMentions > 99 ? '99+' : thread.unreadMentions}</Text>
                </View>
            );
        } else if (thread.unreadReplies && thread.unreadReplies > 0) {
            badgeComponent = (
                <View
                    style={style.unreadDot}
                    testID={`${testIDPrefix}.unread_dot`}
                />
            );
        }
    }

    let name;
    let postBody;
    if (post.deleteAt > 0) {
        name = (
            <FormattedText
                id={'threads.deleted'}
                defaultMessage={'Original Message Deleted'}
                style={[style.threadStarter, style.threadDeleted]}
                numberOfLines={1}
            />
        );
    } else {
        name = (
            <Text
                style={style.threadStarter}
                numberOfLines={1}
            >{threadStarterName}</Text>
        );
        postBody = (
            <Text
                style={style.message}
                numberOfLines={2}
            >
                {post?.message}
            </Text>
        );
    }

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            onLongPress={showThreadOptions}
            onPress={showThread}
            testID={`${testIDPrefix}.item`}
        >
            <View style={style.container}>
                <View style={style.badgeContainer}>
                    {badgeComponent}
                </View>
                <View style={style.postContainer}>
                    <View style={style.header}>
                        <View style={style.headerInfoContainer}>
                            {name}
                            {threadStarterName !== channel?.displayName && (
                                <View style={style.channelNameContainer}>
                                    <Text
                                        style={style.channelName}
                                        numberOfLines={1}
                                    >{channel?.displayName}</Text>
                                </View>
                            )}
                        </View>
                        <FriendlyDate
                            value={thread.lastReplyAt}
                            style={style.date}
                        />
                    </View>
                    {postBody}
                    <ThreadFooter
                        author={author}
                        currentUserId={currentUserId}
                        participants={participants}
                        teammateNameDisplay={teammateNameDisplay}
                        testID={`${testIDPrefix}.footer`}
                        thread={thread}
                        theme={theme}
                    />
                </View>
            </View>
        </TouchableHighlight>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingTop: 16,
            paddingRight: 16,
            flex: 1,
            flexDirection: 'row',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
        },
        badgeContainer: {
            marginTop: 3,
            width: 32,
        },
        postContainer: {
            flex: 1,
        },
        header: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginBottom: 9,
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
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 22,
            paddingRight: 8,
        },
        channelNameContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            maxWidth: '50%',
        },
        channelName: {
            color: theme.centerChannelColor,
            fontSize: 10,
            fontWeight: '600',
            lineHeight: 16,
            letterSpacing: 0.1,
            textTransform: 'uppercase',
            marginLeft: 6,
            marginRight: 6,
            marginTop: 2,
            marginBottom: 2,
        },
        date: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontSize: 12,
            fontWeight: '400',
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
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
            backgroundColor: theme.mentionColor,
            alignSelf: 'center',
        },
        mentionBadgeText: {
            fontFamily: 'Open Sans',
            fontSize: 10,
            lineHeight: 16,
            fontWeight: '700',
            alignSelf: 'center',
            color: theme.centerChannelBg,
        },
    };
});

export default Thread;
