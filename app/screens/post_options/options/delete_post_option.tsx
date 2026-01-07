// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {burnPostNow, deletePost} from '@actions/remote/post';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';
import {isBoRPost, isOwnBoRPost} from '@utils/bor';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    combinedPost?: Post | PostModel;
    post: PostModel;
    currentUser?: UserModel;
}

const messages = defineMessages({
    delete: {
        id: 'post_info.del',
        defaultMessage: 'Delete',
    },
});

const DeletePostOption = ({bottomSheetId, combinedPost, post, currentUser}: Props) => {
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();

    const deleteRegularPost = useCallback(() => {
        Alert.alert(
            formatMessage({id: 'mobile.post.delete_title', defaultMessage: 'Delete Post'}),
            formatMessage({
                id: 'mobile.post.delete_question',
                defaultMessage: 'Are you sure you want to delete this post?',
            }),
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: async () => {
                    await dismissBottomSheet(bottomSheetId);
                    deletePost(serverUrl, combinedPost || post);
                },
            }],
        );
    }, [formatMessage, bottomSheetId, serverUrl, combinedPost, post]);

    const deleteBoRPost = useCallback(() => {
        let alertBody: string;
        if (isOwnBoRPost(post, currentUser)) {
            alertBody = formatMessage({
                id: 'mobile.burn_on_read.delete_now.sender.body',
                defaultMessage: 'This message will be permanently deleted for all recipients right away. This action can\'t be undone. Are you sure you want to delete this message?',
            });
        } else {
            alertBody = formatMessage({
                id: 'mobile.burn_on_read.delete_now.receiver.body',
                defaultMessage: 'This message will be permanently deleted for you right away and can\'t be undone.',
            });
        }

        Alert.alert(
            formatMessage({
                id: 'mobile.burn_on_read.delete_now.title',
                defaultMessage: 'Delete Message Now?',
            }),
            alertBody,
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: async () => {
                    await dismissBottomSheet(bottomSheetId);
                    burnPostNow(serverUrl, combinedPost || post);
                },
            }],
        );
    }, [bottomSheetId, combinedPost, currentUser, formatMessage, post, serverUrl]);

    const onPress = useCallback(() => {
        const deleteFunc = isBoRPost(post) ? deleteBoRPost : deleteRegularPost;
        deleteFunc();
    }, [deleteBoRPost, deleteRegularPost, post]);

    return (
        <BaseOption
            message={messages.delete}
            iconName='trash-can-outline'
            onPress={onPress}
            testID='post_options.delete_post.option'
            isDestructive={true}
        />
    );
};

export default DeletePostOption;
