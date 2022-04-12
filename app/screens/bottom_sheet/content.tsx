// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {GestureResponderEvent, Platform, Text, useWindowDimensions, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    buttonIcon?: string;
    buttonText?: string;
    children: React.ReactNode;
    onPress?: (e: GestureResponderEvent) => void;
    showButton: boolean;
    showTitle: boolean;
    testID?: string;
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
            marginBottom: 12,
        },
        titleText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
        separator: {
            height: 1,
            right: 16,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
});

const BottomSheetContent = ({buttonText, buttonIcon, children, onPress, showButton, showTitle, testID, title}: Props) => {
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const separatorWidth = Math.max(dimensions.width, 450);
    const buttonTestId = `${testID}.${buttonText?.replace(/ /g, '_').toLocaleLowerCase()}.button`;

    return (
        <View
            style={styles.container}
            testID={`${testID}.screen`}
        >
            {showTitle &&
                <View style={styles.titleContainer}>
                    <Text
                        style={styles.titleText}
                        testID={`${testID}.title`}
                    >
                        {title}
                    </Text>
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
                        testID={buttonTestId}
                        text={buttonText}
                    />
                    <View style={{paddingBottom: Platform.select({ios: (isTablet ? 20 : 32), android: 20})}}/>
                </>
            )}
        </View>
    );
};

export default BottomSheetContent;
