// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

const EditOption = () => {
    const handleEdit = () => {
        //todo:
    };

    return (
        <BaseOption
            i18nId={t('post_info.edit')}
            defaultMessage='Edit'
            onPress={handleEdit}
            iconName='pencil-outline'
            testID='post.options.edit'
        />
    );
};

export default EditOption;
