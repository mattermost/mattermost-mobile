// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View, Text, TouchableHighlight} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {goToScreen} from '@actions/navigation';
import type {GlobalState} from '@mm-redux/types/store';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getThread} from '@mm-redux/selectors/entities/threads';
import {getUser} from '@mm-redux/selectors/entities/users';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {Preferences} from '@mm-redux/constants';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import Avatars from '@components/avatars';
import type {Theme} from '@mm-redux/types/preferences';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import PostBody from '@components/post_body';
import {getPost as gP} from '@actions/views/post';
import {DispatchFunc} from '@mm-redux/types/actions';

// import threads from 'app/reducers/views/threads';
// import styleAndroid from '@screens/settings/settings_item/style.android';

interface ThreadItemProps{
    postId: string;
}

const ThreadItem = ({postId}: ThreadItemProps) => {
    const theme = useSelector((state: GlobalState) => getTheme(state));
    let post = useSelector((state: GlobalState) => getPost(state, postId));
    const asyncDispatch: DispatchFunc = useDispatch();

    // const dispatch = useDispatch();
    if (!post) {
        console.log('####################### missing post ID: ', postId);
        asyncDispatch(gP(postId)).then((p) => {
            post = p.data;
        },
        );
    }

    const thread = useSelector((state: GlobalState) => getThread(state, postId));
    const threadStarter = useSelector((state: GlobalState) => getUser(state, post?.user_id));
    const channel = useSelector((state: GlobalState) => getChannel(state, post?.channel_id));
    const channelName = channel?.display_name;
    const threadStarterName = displayUsername(threadStarter, Preferences.DISPLAY_PREFER_FULL_NAME);

    // threadstarter should be the first one in the avatars list
    const participants = thread?.participants.flatMap((p) => (p.id === threadStarter?.id ? [] : p.id));
    participants?.unshift(threadStarter?.id);

    const showThread = () => {
        const screen = 'Thread';
        const title = '';
        const passProps = {
            channelId: post.channel_id,
            rootId: post.id,
        };
        requestAnimationFrame(() => {
            goToScreen(screen, title, passProps);
        });
    };

    const style = getStyleSheet(theme);

    let repliesComponent;
    if (thread?.unread_replies) {
        repliesComponent = (<Text style={style.unreadReplies}>{thread?.unread_replies} { thread?.unread_replies > 0 ? 'new replies' : 'new reply'}</Text>);
    } else {
        repliesComponent = (<Text style={style.replies}>{thread?.reply_count} {thread?.reply_count > 0 ? 'replies' : 'reply'}</Text>);
    }

    const needBadge = thread?.unread_mentions || thread?.unread_replies;
    let badgeComponent;
    if (needBadge) {
        if (thread?.unread_replies && thread.unread_replies > 0) {
            badgeComponent = (<View style={style.unreadDot}/>);
        }
        if (thread?.unread_mentions && thread.unread_mentions > 0) {
            badgeComponent = (<View style={style.mentionBadge}><Text style={style.mentionBadgeText}>{thread?.unread_mentions}</Text></View>);

            // badgeComponent = (<View style={style.mentionBadge}><Text style={style.mentionBadgeText}>{'11'}</Text></View>);
        }
    }

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            onPress={showThread}
        >
            {/* TODO Long press the Thread items list */}
            <View style={style.container}>
                <View style={style.badgeContainer}>
                    {badgeComponent}
                </View>
                <View style={style.postContainer} >
                    <View style={style.header}>
                        <Text style={style.threadStarter} >{threadStarterName} </Text>
                        <View style={style.channelNameContainer}>
                            <Text style={style.channelName}>{channelName}</Text>
                        </View>
                    </View>
                    {/* TODO Truncate the text to two lines */}
                    {/* TODO Remove user mention highlights */}
                    <PostBody
                        post={post}
                        channelIsReadOnly={false}
                        showLongPost={false}
                    />
                    <View style={{flexDirection: 'row'}}>
                        <View style={style.avatarsContainer}>
                            <Avatars
                                style={{flex: 1}}
                                userIds={participants}
                            />
                        </View>
                        {repliesComponent}

                    </View>
                </View>
            </View>
        </TouchableHighlight>
    );
};

export default ThreadItem;

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
            flex: 8,
            marginTop: 3,
        },
        postContainer: {
            flex: 92,
        },
        header: {
            flex: 1,
            flexDirection: 'row',
            alignSelf: 'auto',
        },
        threadStarter: {
            fontFamily: 'Open Sans',
            fontWeight: '600',
            fontSize: 15,
            lineHeight: 22,
            paddingRight: 8,
        },
        channelNameContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            alignSelf: 'center',
            borderRadius: 4,
        },
        channelName: {
            color: theme.centerChannelColor,
            fontFamily: 'Open Sans',
            fontWeight: '600',
            fontSize: 10,
            lineHeight: 16,
            letterSpacing: 1.01,
            textTransform: 'uppercase',
            marginLeft: 6,
            marginRight: 6,
            marginTop: 2,
            marginBottom: 2,
        },
        avatarsContainer: {
            width: 96,
        },
        replies: {
            alignSelf: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        unreadReplies: {
            alignSelf: 'center',
            color: theme.sidebarTextActiveBorder,
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
