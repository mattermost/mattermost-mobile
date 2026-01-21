// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    post: PostModel;
    canDelete: boolean;
    files?: FileInfo[];
}

const messages = defineMessages({
    edit: {
        id: 'post_info.edit',
        defaultMessage: 'Edit',
    },
});

const EditOption = ({post, canDelete, files}: Props) => {
    const onPress = useCallback(async () => {
        await dismissBottomSheet();

        const passProps = {postId: post.id, canDelete, files};
        navigateToScreen(Screens.EDIT_POST, passProps);
    }, [canDelete, files, post]);

    return (
        <BaseOption
            message={messages.edit}
            onPress={onPress}
            iconName='pencil-outline'
            testID='post_options.edit_post.option'
        />
    );
};

export default EditOption;
