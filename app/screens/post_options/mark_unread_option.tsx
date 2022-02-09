// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';

type MarkAsUnreadOptionProps = {
    theme: Theme;
}

//fixme: wire up canMarkAsUnread
const MarkAsUnreadOption = ({theme}: MarkAsUnreadOptionProps) => {
    const handleMarkUnread = () => {
        //todo:
    };

    return (
        <DrawerItem
            testID='post.options.mark.unread'
            labelComponent={
                <FormattedText
                    id='mobile.post_info.mark_unread'
                    defaultMessage='Mark as Unread'
                />
            }
            iconName='mark-as-unread'
            onPress={handleMarkUnread}
            separator={false}
            theme={theme}
        />
    );
};

export default MarkAsUnreadOption;
