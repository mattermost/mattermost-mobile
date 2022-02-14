// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

const ReplyOption = () => {
    const handleReply = () => {
        //todo:
    };
    return (
        <BaseOption
            i18nId={t('mobile.post_info.reply')}
            defaultMessage='Reply'
            iconName='reply-outline'
            onPress={handleReply}
            testID='post.options.reply'
        />
    );
};

export default ReplyOption;
