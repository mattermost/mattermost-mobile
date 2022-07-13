// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionItem, {OptionItemProps} from '@components/option_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            paddingHorizontal: 20,
        },
        optionLabelTextStyle: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
            marginBottom: 4,
        },
        optionDescriptionTextStyle: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const SettingOption = ({...props}: OptionItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <OptionItem
            optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
            optionLabelTextStyle={styles.optionLabelTextStyle}
            containerStyle={[styles.container, props.description && {marginTop: 16}]}
            {...props}
        />
    );
};

export default SettingOption;
