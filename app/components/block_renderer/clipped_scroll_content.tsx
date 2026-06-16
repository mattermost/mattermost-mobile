// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React, {useCallback, useMemo, useState, type ReactNode} from 'react';
import {type LayoutChangeEvent, Platform, Pressable, ScrollView, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type ClippedScrollContentProps = {
    children: ReactNode;
    maxHeight: number;
    onExpand: () => void;
    containerPadding: number;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        expandButton: {
            height: 34,
            width: 34,
            position: 'absolute',
            bottom: -8,
            right: -8,
        },
        iconButton: {
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 50,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            width: 34,
            height: 34,
        },
        icon: {
            fontSize: Platform.select({ios: 13, default: 14}),
            color: theme.linkColor,
        },
        moreBelow: {
            height: 20,
            position: 'absolute',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});

const ClippedScrollContent = ({
    children,
    maxHeight,
    onExpand,
    testID,
    containerPadding,
}: ClippedScrollContentProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [containerWidth, setContainerWidth] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const handleExpand = usePreventDoubleTap(onExpand);

    const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    }, []);

    const handleContentSizeChange = useCallback((_: number, height: number) => {
        setContentHeight(height);
    }, []);

    const isOverflowing = contentHeight > maxHeight;

    const moreBelow = useMemo(() => {
        if (!isOverflowing) {
            return null;
        }

        return (
            <LinearGradient
                colors={[
                    changeOpacity(theme.centerChannelColor, 0.0),
                    changeOpacity(theme.centerChannelColor, 0.1),
                ]}
                style={[styles.moreBelow, {
                    bottom: -containerPadding,
                    left: -containerPadding,
                    right: -containerPadding,
                }]}
            />
        );
    }, [containerPadding, isOverflowing, styles.moreBelow, theme.centerChannelColor]);

    const expandButton = useMemo(() => {
        let expandButtonOffset = containerWidth - 20;
        if (Platform.OS === 'android') {
            expandButtonOffset -= 10;
        }

        if (expandButtonOffset <= 0 || !isOverflowing) {
            return null;
        }

        return (
            <Pressable
                onPress={handleExpand}
                style={({pressed}) => [
                    styles.expandButton,
                    {left: expandButtonOffset},
                    pressed && {opacity: 0.72},
                ]}
                testID={`${testID}.expand.button`}
            >
                <View style={styles.iconButton}>
                    <CompassIcon
                        name='arrow-expand'
                        style={styles.icon}
                    />
                </View>
            </Pressable>
        );
    }, [containerWidth, handleExpand, isOverflowing, styles.expandButton, styles.icon, styles.iconButton, testID]);

    const maxHeightStyle = useMemo(() => ({maxHeight}), [maxHeight]);

    return (
        <Pressable
            onPress={handleExpand}
            disabled={!isOverflowing}
            testID={testID}
        >
            <ScrollView
                onContentSizeChange={handleContentSizeChange}
                onLayout={handleContainerLayout}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={maxHeightStyle}
            >
                <View pointerEvents={isOverflowing ? 'none' : 'auto'}>
                    {children}
                </View>
            </ScrollView>
            {moreBelow}
            {expandButton}
        </Pressable>
    );
};

export default ClippedScrollContent;
