// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {deletePost} from '@actions/remote/post';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import BaseOption from './base_option';

type Props = {
    postId: string ;
}
const DeletePostOption = ({postId}: Props) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(() => {
        deletePost(serverUrl, postId);
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [postId, serverUrl]);

    return (
        <BaseOption
            i18nId={t('post_info.del')}
            defaultMessage='Delete'
            iconName='trash-can-outline'
            onPress={onPress}
            testID='post.options.delete.post'
            isDestructive={true}
        />
    );
};

export default DeletePostOption;
