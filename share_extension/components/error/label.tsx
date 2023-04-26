// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, Text, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    style?: StyleProp<ViewStyle>;
    text: string;
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    icon: {
        color: theme.errorTextColor,
    },
    message: {
        color: theme.errorTextColor,
        marginLeft: 7,
        top: -2,
        ...typography('Body', 75),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: 20,
        marginTop: 12,
    },
}));

const ErrorLabel = ({style, text, theme}: Props) => {
    const styles = getStyles(theme);
    return (
        <View style={[styles.row, style]}>
            <CompassIcon
                name='alert-outline'
                size={12}
                style={styles.icon}
            />
            <Text style={styles.message}>
                {text}
            </Text>
        </View>
    );
};

export default ErrorLabel;
