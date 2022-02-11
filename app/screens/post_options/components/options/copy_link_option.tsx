// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

const CopyPermalinkOption = () => {
    const handleCopyLink = () => {
        //todo:
    };
    return (
        <BaseOption
            i18nId={t('get_post_link_modal.title')}
            defaultMessage='Copy Link'
            onPress={handleCopyLink}
            iconName='link-variant'
            testID='post.options.copy.permalink'
        />
    );
};

export default CopyPermalinkOption;
