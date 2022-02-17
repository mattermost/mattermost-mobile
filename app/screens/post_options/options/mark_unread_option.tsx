// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

//fixme: wire up canMarkAsUnread
const MarkAsUnreadOption = () => {
    const handleMarkUnread = () => {
        //todo:
    };

    return (
        <BaseOption
            i18nId={t('mobile.post_info.mark_unread')}
            defaultMessage='Mark as Unread'
            iconName='mark-as-unread'
            onPress={handleMarkUnread}
            testID='post.options.mark.unread'
        />
    );
};

export default MarkAsUnreadOption;
