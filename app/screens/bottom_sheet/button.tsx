// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    disabled?: boolean;
    onPress?: () => void;
    icon?: string;
    testID?: string;
    text?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        buttonContainer: {
            paddingHorizontal: 20,
        },
        container: {
            backgroundColor: theme.centerChannelBg,
        },
        separator: {
            height: 1,
            right: 20,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: 20,
        },
    };
});

export const BUTTON_HEIGHT = 101;

function BottomSheetButton({disabled = false, onPress, icon, testID, text}: Props) {
    const theme = useTheme();
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const separatorWidth = Math.max(dimensions.width, 450);

    return (
        <View style={styles.container}>
            <View style={[styles.separator, {width: separatorWidth}]}/>
            <View style={styles.buttonContainer}>
                <Button
                    onPress={onPress}
                    text={text || ''}
                    iconName={icon}
                    testID={testID}
                    theme={theme}
                    size='lg'
                    disabled={disabled}
                />
            </View>
            <View style={{paddingBottom: Platform.select({ios: (isTablet ? 20 : 0), android: 20})}}/>
        </View>
    );
}

export default BottomSheetButton;
