// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {GestureResponderEvent, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onPress?: (e: GestureResponderEvent) => void;
    icon?: string;
    text?: string;
}
export default function BottomSheetButton({onPress, icon, text}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <TouchableWithFeedback
            onPress={onPress}
            type='opacity'
            style={styles.button}
        >
            {icon && (
                <View style={styles.icon_container}>
                    <CompassIcon
                        size={24}
                        name={icon}
                        color={theme.buttonColor}
                    />
                </View>
            )}
            {text && (
                <Text
                    style={styles.text}
                >{text}</Text>
            )}

        </TouchableWithFeedback>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            backgroundColor: theme.buttonBg,
            display: 'flex',
            flexDirection: 'row',
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
        },
        text: {
            color: theme.buttonColor,
            fontWeight: 'bold',
            fontSize: 16,
            lineHeight: 18,
            paddingHorizontal: 1,
        },
        icon_container: {
            width: 24,
            height: 24,
            marginBottom: 1,
        },
    };
});
