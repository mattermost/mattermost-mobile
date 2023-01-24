// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {deletePost} from '@actions/remote/post';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    combinedPost?: Post | PostModel;
    post: PostModel;
}
const DeletePostOption = ({bottomSheetId, combinedPost, post}: Props) => {
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();

    const onPress = useCallback(() => {
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
    }, [bottomSheetId, post, combinedPost, serverUrl]);

    return (
        <BaseOption
            i18nId={t('post_info.del')}
            defaultMessage='Delete'
            iconName='trash-can-outline'
            onPress={onPress}
            testID='post_options.delete_post.option'
            isDestructive={true}
        />
    );
};

export default DeletePostOption;
