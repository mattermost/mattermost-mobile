// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionItem, {OptionItemProps} from '@components/option_item';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyle = makeStyleSheetFromTheme((theme: Theme) => ({
    optionLabelTextStyle: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
}));

const PostPriorityPickerItem = (props: Omit<OptionItemProps, 'type'>) => {
    const theme = useTheme();
    const style = getStyle(theme);

    const testID = `post_priority_picker_item.${props.value || 'standard'}`;

    return (
        <OptionItem
            optionLabelTextStyle={style.optionLabelTextStyle}
            testID={testID}
            type='select'
            {...props}
        />
    );
};

export default PostPriorityPickerItem;
