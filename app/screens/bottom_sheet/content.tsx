// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {GestureResponderEvent, Platform, Text, useWindowDimensions, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    buttonIcon?: string;
    buttonText?: string;
    children: React.ReactNode;
    onPress?: (e: GestureResponderEvent) => void;
    showButton: boolean;
    showTitle: boolean;
    title?: string;
}

export const TITLE_HEIGHT = 38;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        titleContainer: {
            marginTop: 4,
            marginBottom: 4,
        },
        titleText: {
            color: theme.centerChannelColor,
            lineHeight: 30,
            fontSize: 25,
            fontFamily: 'OpenSans-SemiBold',
        },
        separator: {
            height: 1,
            right: 16,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
});

const BottomSheetContent = ({buttonText, buttonIcon, children, onPress, showButton, showTitle, title}: Props) => {
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const separatorWidth = Math.max(dimensions.width, 450);

    return (
        <View style={styles.container}>
            {showTitle &&
                <View style={styles.titleContainer}>
                    <Text style={styles.titleText}>{title}</Text>
                </View>
            }
            <>
                {children}
            </>
            {showButton && (
                <>
                    <View style={[styles.separator, {width: separatorWidth, marginBottom: (isTablet ? 20 : 12)}]}/>
                    <Button
                        onPress={onPress}
                        icon={buttonIcon}
                        text={buttonText}
                    />
                    <View style={{paddingBottom: Platform.select({ios: (isTablet ? 20 : 32), android: 20})}}/>
                </>
            )}
        </View>
    );
};

export default BottomSheetContent;
