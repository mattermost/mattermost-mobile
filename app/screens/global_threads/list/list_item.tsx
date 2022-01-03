// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableHighlight, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import FriendlyDate from '@components/friendly_date';
import {Post} from '@constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ListItemFooter from './list_item_footer';

type Props = {
    testID: string;
    theme: Theme;
};

const ListItem = ({testID, theme}: Props) => {
    const style = getStyleSheet(theme);

    const channel = {
        id: '456',
        name: 'CHANNEL NAME',
    };

    const thread = {
        id: '123',
        last_reply_at: Date.now() - 400000,
        unread_mentions: 1,
        unread_replies: 3,
        participants: [],
    };

    const threadStarter = {
        id: 'user1'
    };

    const post = {
        id: '123',
        message: 'POST MESSAGE',
        state: 'active',
    };

    // const threadStarterName = displayUsername(threadStarter, Preferences.DISPLAY_PREFER_FULL_NAME);
    const threadStarterName = 'Anurag Shivarathri';

    const showThread = () => {
        //@todo
    };

    const showThreadOptions = () => {
        //@todo
    };

    const testIDPrefix = `${testID}.${thread.id}`;

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
    if (post.state === Post.POST_DELETED) {
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
    }

    let postBody;
    if (post.state !== Post.POST_DELETED) {
        postBody = (
            <Text
                style={style.message}
                numberOfLines={2}
            >
                {post.message}
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
                            <View style={style.channelNameContainer}>
                                <Text
                                    style={style.channelName}
                                    numberOfLines={1}
                                >{channel.name}</Text>
                            </View>
                        </View>
                        <FriendlyDate
                            value={thread.last_reply_at}
                            style={style.date}
                        />
                    </View>
                    {postBody}
                    <ListItemFooter
                        testID={`${testIDPrefix}.footer`}
                        thread={thread}
                        theme={theme}
                        threadStarter={threadStarter}
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

export default ListItem;
