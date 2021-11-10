// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {switchMap, of as of$} from 'rxjs';

import Avatar from '@components/post_list/post/avatar';
import Message from '@components/post_list/post/body/message';
import Header from '@components/post_list/post/header';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import * as Screens from '@constants/screens';
import {fromAutoResponder, isFromWebhook, isSystemMessage, isEdited as postEdited} from '@utils/post';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    currentUser: UserModel;
    post: PostModel;
    team: TeamModel;
    theme: Theme;
}

const styles = StyleSheet.create({
    header: {
        flex: 1,
        flexDirection: 'row',
        marginLeft: 12,
        paddingTop: 5,
    },
    container: {
        flex: 1,
    },
    content: {
        flexDirection: 'row',
    },
    rightColumn: {
        flex: 1,
        flexDirection: 'column',
        marginRight: 12,
        paddingBottom: 5,
    },
    message: {
        paddingBottom: 2,
        paddingTop: 2,
        flex: 1,
    },
});

function Mention({post, channel, team, currentUser, theme}: Props) {
    const isAutoResponder = fromAutoResponder(post);
    const isSystemPost = isSystemMessage(post);
    const isWebHook = isFromWebhook(post);
    const isEdited = postEdited(post);

    const postAvatar = isAutoResponder ? (
        <SystemAvatar theme={theme}/>
    ) : (
        <Avatar
            isAutoReponse={isAutoResponder}
            isSystemPost={isSystemPost}
            post={post}
        />
    );

    const header = isSystemPost && !isAutoResponder ? (
        <SystemHeader
            createAt={post.createAt}
            theme={theme}
        />
    ) : (
        <Header
            currentUser={currentUser}
            isAutoResponse={isAutoResponder}
            differentThreadSequence={true}
            isEphemeral={false}
            isPendingOrFailed={false}
            isSystemPost={isSystemPost}
            isWebHook={isWebHook}
            location={Screens.MENTIONS}
            post={post}
            shouldRenderReplyButton={false}
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text>{channel.displayName}</Text>
                {Boolean(team) && (
                    <Text>{` | ${team?.displayName}`}</Text>
                )}
            </View>
            <View style={styles.content}>
                {postAvatar}
                <View style={styles.rightColumn}>
                    {header}
                    <View style={styles.message}>
                        <Message
                            highlight={false}
                            isEdited={isEdited}
                            isPendingOrFailed={false}
                            isReplyPost={false}
                            location={Screens.MENTIONS}
                            post={post}
                            theme={theme}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}

const enhance = compose(
    withObservables(['mention'], ({mention}) => ({
        post: mention.post,
    })),
    withObservables(['post'], ({post}: {post: PostModel}) => ({
        channel: post.channel,
        team: post.channel.observe().pipe(
            switchMap((channel) => channel.team || of$(null)),
        ),
    })),
);

export default enhance(Mention);
