// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionItem, {OptionItemProps, OptionType} from '@components/option_item';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    labelContainer: {
        alignItems: 'flex-start',
    },
    optionLabelText: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
}));

type Props = Omit<OptionItemProps, 'type'> & {
    type?: OptionType;
}

const PickerOption = ({type, ...rest}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const testID = `post_priority_picker_item.${rest.value || 'standard'}`;

    return (
        <OptionItem
            labelContainerStyle={style.labelContainer}
            optionLabelTextStyle={style.optionLabelText}
            testID={testID}
            type={type || 'select'}
            {...rest}
        />
    );
};

export default PickerOption;
