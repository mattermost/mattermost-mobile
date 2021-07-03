// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, TouchableHighlight} from 'react-native';
import {intlShape} from 'react-intl';
import {useSelector} from 'react-redux';

import {goToScreen} from '@actions/navigation';
import RemoveMarkdown from '@components/remove_markdown';
import FriendlyDate from '@components/friendly_date';

import {Posts, Preferences} from '@mm-redux/constants';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getPost as getPostSelector} from '@mm-redux/selectors/entities/posts';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getThread} from '@mm-redux/selectors/entities/threads';
import {getUser} from '@mm-redux/selectors/entities/users';
import type {Theme} from '@mm-redux/types/preferences';
import type {GlobalState} from '@mm-redux/types/store';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ThreadFooter from '../thread_footer';

type Props = {
    intl: typeof intlShape;
    postId: string;
    testID: string;
};

function ThreadItem({intl, postId, testID}: Props) {
    const theme = useSelector((state: GlobalState) => getTheme(state));
    const style = getStyleSheet(theme);

    const thread = useSelector((state: GlobalState) => getThread(state, postId));
    if (!thread) {
        return null;
    }

    const post = useSelector((state: GlobalState) => getPostSelector(state, postId));

    const threadStarter = useSelector((state: GlobalState) => getUser(state, post.user_id));
    const channel = useSelector((state: GlobalState) => getChannel(state, post.channel_id));
    const channelName = channel?.display_name;
    const threadStarterName = displayUsername(threadStarter, Preferences.DISPLAY_PREFER_FULL_NAME);

    const showThread = () => {
        const screen = 'Thread';
        const passProps = {
            channelId: post.channel_id,
            rootId: post.id,
        };
        goToScreen(screen, '', passProps);
    };

    const testIDPrefix = `${testID}.${post.id}`;

    const needBadge = thread.unread_mentions || thread.unread_replies;
    let badgeComponent;
    if (needBadge) {
        if (thread.unread_mentions && thread.unread_mentions > 0) {
            badgeComponent = (
                <View
                    style={style.mentionBadge}
                    testID={`${testIDPrefix}.unread_mentions`}
                >
                    <Text style={style.mentionBadgeText}>{thread.unread_mentions > 99 ? '99+' : thread.unread_mentions}</Text>
                </View>
            );
        } else if (thread.unread_replies && thread.unread_replies > 0) {
            badgeComponent = (
                <View
                    style={style.unreadDot}
                    testID={`${testIDPrefix}.unread_dot`}
                />
            );
        }
    }

    let name;
    if (post.state === Posts.POST_DELETED) {
        name = (
            <Text
                style={[style.threadStarter, style.threadDeleted]}
                numberOfLines={1}
            >{intl.formatMessage({
                    id: 'threads.deleted',
                    defaultMessage: 'Original Message Deleted',
                })}</Text>
        );
    } else {
        name = (
            <Text
                style={style.threadStarter}
                numberOfLines={1}
            >{threadStarterName}</Text>
        );
    }

    let postBody;
    if (post.state !== Posts.POST_DELETED) {
        postBody = (
            <Text
                style={style.message}
                numberOfLines={2}
            >
                <RemoveMarkdown value={post.message || ''}/>
            </Text>
        );
    }

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
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
                            <View style={style.channelNameContainer}>
                                <Text
                                    style={style.channelName}
                                    numberOfLines={1}
                                >{channelName}</Text>
                            </View>
                        </View>
                        <FriendlyDate
                            value={thread.last_reply_at}
                            style={style.date}
                        />
                    </View>
                    {postBody}
                    <ThreadFooter
                        testID={`${testIDPrefix}.footer`}
                        thread={thread}
                        threadStarter={threadStarter}
                        location='globalThreads'
                    />
                </View>
            </View>
        </TouchableHighlight>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingTop: 16,
            paddingBottom: 16,
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
            letterSpacing: 1.01,
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
            marginBottom: 9,
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

export default ThreadItem;
