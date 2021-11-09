// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, Text} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type HeaderRightButton = {
    borderless?: boolean;
    buttonType?: 'native' | 'opacity' | 'highlight';
    color?: string;
    iconName: string;
    onPress: () => void;
    rippleRadius?: number;
    testID?: string;
}

type Props = {
    defaultHeight: number;
    hasSearch: boolean;
    isLargeTitle: boolean;
    largeHeight: number;
    leftComponent?: React.ReactElement;
    onBackPress?: () => void;
    rightButtons?: HeaderRightButton[];
    scrollValue: Animated.SharedValue<number>;
    showBackButton?: boolean;
    subtitle?: string;
    theme: Theme;
    title?: string;
    top: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: theme.sidebarBg,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    subtitle: {
        color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
        fontFamily: 'OpenSans',
        fontSize: 12,
        lineHeight: 12,
        marginBottom: 8,
        marginTop: 2,
    },
    titleContainer: {
        alignItems: Platform.select({android: 'flex-start', ios: 'center'}),
        justifyContent: 'center',
        flex: 3,
        height: '100%',
        paddingHorizontal: 8,
    },
    leftContainer: {
        alignItems: 'center',
        flex: Platform.select({ios: 1}),
        flexDirection: 'row',
        height: '100%',
    },
    rightContainer: {
        alignItems: 'center',
        flex: Platform.select({ios: 1}),
        flexDirection: 'row',
        height: '100%',
        justifyContent: 'flex-end',
    },
    rightIcon: {
        marginLeft: 20,
    },
    title: {
        color: theme.sidebarHeaderTextColor,
        ...typography('Heading', 300),
    },
}));

const Header = ({
    defaultHeight,
    hasSearch,
    isLargeTitle,
    largeHeight,
    leftComponent,
    onBackPress,
    rightButtons,
    scrollValue,
    showBackButton = true,
    subtitle,
    theme,
    title,
    top,
}: Props) => {
    const styles = getStyleSheet(theme);

    const opacity = useAnimatedStyle(() => {
        if (!isLargeTitle) {
            return {opacity: 1};
        }

        if (hasSearch) {
            return {opacity: 0};
        }

        const barHeight = Platform.OS === 'ios' ? (largeHeight - defaultHeight - (top / 2)) : largeHeight - defaultHeight;
        const val = (top + scrollValue.value);
        return {
            opacity: val >= barHeight ? withTiming(1, {duration: 250}) : 0,
        };
    }, [defaultHeight, largeHeight, top, isLargeTitle, hasSearch]);

    const containerStyle = useMemo(() => {
        return [styles.container, {height: defaultHeight + top, paddingTop: top}];
    }, [top, defaultHeight, theme]);

    const additionalTitleStyle = useMemo(() => ({
        marginLeft: Platform.select({android: showBackButton && !leftComponent ? 20 : 0}),
    }), [leftComponent, showBackButton, theme]);

    return (
        <Animated.View style={containerStyle}>
            <Animated.View style={styles.leftContainer}>
                {showBackButton &&
                <TouchableWithFeedback
                    borderlessRipple={true}
                    onPress={onBackPress}
                    rippleRadius={20}
                    type={Platform.select({android: 'native', default: 'opacity'})}
                    testID='navigation.header.back'
                >
                    <CompassIcon
                        size={24}
                        name={Platform.select({android: 'arrow-left', ios: 'arrow-back-ios'})!}
                        color={theme.sidebarHeaderTextColor}
                    />
                </TouchableWithFeedback>
                }
                {leftComponent}
            </Animated.View>
            <Animated.View style={[styles.titleContainer, additionalTitleStyle]}>
                {!hasSearch &&
                <Animated.Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={[styles.title, opacity]}
                    testID='navigation.header.title'
                >
                    {title}
                </Animated.Text>
                }
                {!isLargeTitle &&
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={styles.subtitle}
                    testID='navigation.header.subtitle'
                >
                    {subtitle}
                </Text>
                }
            </Animated.View>
            <Animated.View style={styles.rightContainer}>
                {Boolean(rightButtons?.length) &&
                rightButtons?.map((r, i) => (
                    <TouchableWithFeedback
                        key={r.iconName}
                        borderlessRipple={r.borderless === undefined ? true : r.borderless}
                        onPress={r.onPress}
                        rippleRadius={r.rippleRadius || 20}
                        type={r.buttonType || Platform.select({android: 'native', default: 'opacity'})}
                        style={i > 0 ? styles.rightIcon : undefined}
                        testID={r.testID}
                    >
                        <CompassIcon
                            size={24}
                            name={r.iconName}
                            color={r.color || theme.sidebarHeaderTextColor}
                        />
                    </TouchableWithFeedback>
                ))
                }
            </Animated.View>
        </Animated.View>
    );
};

export default Header;

