// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';

type ReplyOptionProps = {
    theme: Theme;
};

const ReplyOption = ({theme}: ReplyOptionProps) => {
    const handleReply = () => {
        //todo:
    };
    return (
        <DrawerItem
            testID='post.options.reply'
            labelComponent={
                <FormattedText
                    id='mobile.post_info.reply'
                    defaultMessage='Reply'
                />
            }
            iconName='reply-outline'
            onPress={handleReply}
            separator={false}
            theme={theme}
        />
    );
};

export default ReplyOption;
