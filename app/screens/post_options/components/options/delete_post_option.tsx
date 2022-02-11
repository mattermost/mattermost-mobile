// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

//fixme: wire up handleDeletePost
const DeletePostOption = () => {
    const handleDeletePost = () => null;

    return (
        <BaseOption
            i18nId={t('post_info.del')}
            defaultMessage='Delete'
            iconName='trash-can-outline'
            onPress={handleDeletePost}
            testID='post.options.delete.post'
            isDestructive={true}
        />
    );
};

export default DeletePostOption;
