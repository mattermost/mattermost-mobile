// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {t} from '@i18n';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';
import PostModel from '@typings/database/models/servers/post';

import BaseOption from './base_option';

type Props = {
    post: PostModel;
}
const EditOption = ({post}: Props) => {
    const onPress = useCallback(async () => {
        // https://mattermost.atlassian.net/browse/MM-41991
        await dismissBottomSheet(Screens.POST_OPTIONS);
        goToScreen('EDIT_SCREEN_NOT_IMPLEMENTED_YET', '', {post});
    }, [post]);

    return (
        <BaseOption
            i18nId={t('post_info.edit')}
            defaultMessage='Edit'
            onPress={onPress}
            iconName='pencil-outline'
            testID='post.options.edit'
        />
    );
};

export default EditOption;
