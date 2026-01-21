// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {useBottomSheetStyle} from './hooks';

type Props = {
    disabled?: boolean;
    onPress?: () => void;
    icon?: string;
    iconComponent?: React.ReactNode;
    isIconOnTheRight?: boolean;
    showLoader?: boolean;
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
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: 20,
        },
    };
});

export const BUTTON_HEIGHT = 101;

function BottomSheetButton({disabled = false, onPress, icon, iconComponent, isIconOnTheRight, showLoader = false, testID, text}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const containerStyle = useBottomSheetStyle();
    const {bottom} = useSafeAreaInsets();

    const bottomViewStyle = useMemo(() => {
        return {
            top: bottom, // we need to move it down the same amount as the height
            height: bottom,
            backgroundColor: theme.centerChannelBg,
        };
    }, [bottom, theme.centerChannelBg]);

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={[styles.separator]}/>
            <View style={styles.buttonContainer}>
                <Button
                    onPress={onPress}
                    text={text || ''}
                    iconName={icon}
                    iconComponent={iconComponent}
                    isIconOnTheRight={isIconOnTheRight}
                    testID={testID}
                    theme={theme}
                    size='lg'
                    disabled={disabled}
                    showLoader={showLoader}
                />
            </View>
            <View style={bottomViewStyle}/>
        </View>
    );
}

export default BottomSheetButton;
