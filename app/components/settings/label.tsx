// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        labelContainer: {
            flexDirection: 'row',
            marginTop: 15,
            marginBottom: 10,
        },
        label: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15,
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
    };
});

type Props = {
    label: string;
    optional: boolean;
    testID: string;
}
function Label({
    label,
    optional,
    testID,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.labelContainer}>
            <Text
                style={style.label}
                testID={`${testID}.label`}
            >
                {label}
            </Text>
            {!optional && (<Text style={style.asterisk}>{' *'}</Text>)}
            {optional && (
                <FormattedText
                    style={style.optional}
                    id='channel_modal.optional'
                    defaultMessage='(optional)'
                />
            )}
        </View>
    );
}

export default Label;
