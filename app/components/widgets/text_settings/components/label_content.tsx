// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@app/components/formatted_text';
import {IntlText} from '@components/widgets/text_settings';
import {makeStyleSheetFromTheme} from '@utils/theme';

type LabelContentProps = {
    label: IntlText | string;
    testID: string;
    theme: Theme;
};

const LabelContent = ({label, testID, theme}: LabelContentProps) => {
    const style = getStyleSheet(theme);

    if (typeof label === 'string') {
        return (
            <Text
                style={style.title}
                testID={`${testID}.label`}
            >
                {label}
            </Text>
        );
    } else if (label?.defaultMessage) {
        return (
            <FormattedText
                style={style.title}
                id={label.id}
                defaultMessage={label.defaultMessage}
                testID={`${testID}.label_content`}
            />
        );
    }

    return null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15,
        },
    };
});

export default LabelContent;
