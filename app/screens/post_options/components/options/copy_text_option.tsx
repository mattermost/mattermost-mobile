// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

const CopyTextOption = () => {
    const handleCopyText = () => {
        //todo:
    };
    return (
        <BaseOption
            i18nId={t('mobile.post_info.copy_text')}
            defaultMessage='Copy Text'
            iconName='content-copy'
            onPress={handleCopyText}
            testID='post.options.copy.text'
        />
    );
};

export default CopyTextOption;
