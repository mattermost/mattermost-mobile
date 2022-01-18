// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react';
import {useIntl} from 'react-intl';
import {View, StyleSheet} from 'react-native';

import {showPermalink} from '@actions/local/permalink';
import Avatar from '@components/post_list/post/avatar';
import Message from '@components/post_list/post/body/message';
import Header from '@components/post_list/post/header';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {fromAutoResponder, isFromWebhook, isSystemMessage, isEdited as postEdited} from '@utils/post';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';

import ChannelInfo from '../channel_info';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    post: PostModel;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    content: {
        flexDirection: 'row',
        paddingBottom: 8,
    },
    message: {
        flex: 1,
    },
    profilePictureContainer: {
        marginBottom: 5,
        marginRight: 10,
        marginTop: 10,
    },
});

function Mention({post, currentUser}: Props) {
    const pressDetected = useRef(false);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const isAutoResponder = fromAutoResponder(post);
    const isSystemPost = isSystemMessage(post);
    const isWebHook = isFromWebhook(post);
    const isEdited = postEdited(post);

    const postAvatar = (
        <View style={[styles.profilePictureContainer]}>
            {isAutoResponder ? (
                <SystemAvatar theme={theme}/>
            ) : (
                <Avatar
                    isAutoReponse={isAutoResponder}
                    isSystemPost={isSystemPost}
                    post={post}
                />
            )}
        </View>
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

    const handlePress = preventDoubleTap(() => {
        pressDetected.current = true;

        showPermalink(serverUrl, '', post.id, intl);

        const pressTimeout = setTimeout(() => {
            pressDetected.current = false;
            clearTimeout(pressTimeout);
        }, 300);
    });

    return (
        <TouchableWithFeedback
            onPress={handlePress}
            underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
            cancelTouchOnPanning={true}
        >
            <View style={styles.container}>
                <>
                    <ChannelInfo post={post}/>
                    <View style={styles.content}>
                        {postAvatar}
                        <View>
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
                </>
            </View>
        </TouchableWithFeedback>
    );
}

export default Mention;
