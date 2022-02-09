// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import BaseOption from './base_option';

const ReplyOption = () => {
    const handleReply = () => {
        //todo:
    };
    return (
        <BaseOption
            i18nId='mobile.post_info.reply'
            defaultMessage='Reply'
            iconName='reply-outline'
            onPress={handleReply}
            optionType='post.options.reply'
        />
    );
};

export default ReplyOption;
