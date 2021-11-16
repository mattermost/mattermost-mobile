// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet} from 'react-native';

import Avatar from '@components/post_list/post/avatar';
import Message from '@components/post_list/post/body/message';
import Header from '@components/post_list/post/header';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import * as Screens from '@constants/screens';
import {fromAutoResponder, isFromWebhook, isSystemMessage, isEdited as postEdited} from '@utils/post';

import ChannelInfo from './channel_info';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    post: PostModel;
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

function Mention({post, currentUser, theme}: Props) {
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
            <ChannelInfo
                post={post}
                theme={theme}
            />
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

export default Mention;
