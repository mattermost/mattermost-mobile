// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import BaseOption from './base_option';

//fixme: wire up canMarkAsUnread
const MarkAsUnreadOption = () => {
    const handleMarkUnread = () => {
        //todo:
    };

    return (
        <BaseOption
            i18nId='mobile.post_info.mark_unread'
            defaultMessage='Mark as Unread'
            iconName='mark-as-unread'
            onPress={handleMarkUnread}
            optionType='post.options.mark.unread'
        />
    );
};

export default MarkAsUnreadOption;
