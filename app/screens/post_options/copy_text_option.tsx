// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';

type CopyTextProps = {
    theme: Theme;
}

const CopyTextOption = ({theme}: CopyTextProps) => {
    const handleCopyText = () => {
        //todo:
    };
    return (
        <DrawerItem
            testID='post.options.copy.text'
            labelComponent={
                <FormattedText
                    id='mobile.post_info.copy_text'
                    defaultMessage='Copy Text'
                />
            }
            iconName='content-copy'
            onPress={handleCopyText}
            separator={false}
            theme={theme}
        />
    );
};

export default CopyTextOption;
