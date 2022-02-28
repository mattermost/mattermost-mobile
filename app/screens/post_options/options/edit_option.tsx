// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {Screens} from '@constants';
import {t} from '@i18n';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';
import PostModel from '@typings/database/models/servers/post';

import BaseOption from './base_option';

type Props = {
    post: PostModel;
}
const EditOption = ({post}: Props) => {
    const intl = useIntl();
    const onPress = useCallback(async () => {
        await dismissBottomSheet(Screens.POST_OPTIONS);
        const title = intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'});
        goToScreen(Screens.EDIT_POST, title, {post});
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
