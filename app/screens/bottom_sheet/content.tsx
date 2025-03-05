// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {type GestureResponderEvent, type StyleProp, Text, useWindowDimensions, View, type ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    buttonIcon?: string;
    buttonText?: string;
    children: React.ReactNode;
    disableButton?: boolean;
    onPress?: (e: GestureResponderEvent) => void;
    showButton: boolean;
    showTitle: boolean;
    testID?: string;
    title?: string;
    titleSeparator?: boolean;
    currentSize?: string|number; // passed from parent to communicate the current size of the bottom sheet
}

const TITLE_MARGIN_TOP = 4;
const TITLE_MARGIN_BOTTOM = 12;

export const TITLE_HEIGHT = TITLE_MARGIN_TOP + TITLE_MARGIN_BOTTOM + 30; // typography 600 line height
export const TITLE_SEPARATOR_MARGIN = 12;
export const TITLE_SEPARATOR_MARGIN_TABLET = 20;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexGrow: 1,
        },
        titleContainer: {
            marginTop: TITLE_MARGIN_TOP,
            marginBottom: TITLE_MARGIN_BOTTOM,
        },
        titleText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
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

const BottomSheetContent = ({buttonText, buttonIcon, children, disableButton, onPress, showButton, showTitle, testID, title, titleSeparator, currentSize}: Props) => {
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const separatorWidth = Math.max(dimensions.width, 450);
    const buttonTestId = `${testID}.${buttonText?.replace(/ /g, '_').toLocaleLowerCase()}.button`;

    const containerWithSize = useMemo((): StyleProp<ViewStyle> => {
        return {
            ...styles.container,
            height: currentSize || 'auto',
        } as StyleProp<ViewStyle>;
    }, [currentSize, styles.container]);

    return (
        <View
            style={containerWithSize}
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
            {titleSeparator &&
                <View style={[styles.separator, {width: separatorWidth, marginBottom: (isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN)}]}/>
            }
            <>
                {children}
            </>
            {showButton && (
                <Button
                    disabled={disableButton}
                    onPress={onPress}
                    icon={buttonIcon}
                    testID={buttonTestId}
                    text={buttonText}
                />
            )
            }
        </View>
    );
};

export default BottomSheetContent;
