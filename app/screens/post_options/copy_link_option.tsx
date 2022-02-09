// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';

type CopyTextProps = {
    theme: Theme;
}

const CopyPermalinkOption = ({theme}: CopyTextProps) => {
    const handleCopyLink = () => {
        //todo:
    };
    return (
        <DrawerItem
            testID='post.options.copy.permalink'
            labelComponent={
                <FormattedText
                    id='get_post_link_modal.title'
                    defaultMessage='Copy Link'
                />
            }
            iconName='link-variant'
            onPress={handleCopyLink}
            separator={false}
            theme={theme}
        />
    );
};

export default CopyPermalinkOption;
