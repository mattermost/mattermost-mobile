// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, Text, View} from 'react-native';
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
    onTitlePress?: () => void;
    rightButtons?: HeaderRightButton[];
    scrollValue?: Animated.SharedValue<number>;
    showBackButton?: boolean;
    subtitle?: string;
    subtitleCompanion?: React.ReactElement;
    theme: Theme;
    title?: string;
    top: number;
}

const hitSlop = {top: 20, bottom: 20, left: 20, right: 20};
const rightButtonHitSlop = {top: 20, bottom: 5, left: 5, right: 5};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    centered: {
        alignItems: Platform.select({android: 'flex-start', ios: 'center'}),
    },
    container: {
        alignItems: 'center',
        backgroundColor: theme.sidebarBg,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    subtitleContainer: {
        flexDirection: 'row',
        justifyContent: Platform.select({android: 'flex-start', ios: 'center'}),
        left: Platform.select({ios: undefined, default: 3}),
    },
    subtitle: {
        color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
        ...typography('Body', 75),
        lineHeight: 12,
        marginBottom: 8,
        marginTop: 2,
        height: 13,
    },
    titleContainer: {
        alignItems: Platform.select({android: 'flex-start', ios: 'center'}),
        justifyContent: 'center',
        flex: 3,
        height: '100%',
        paddingHorizontal: 8,
        ...Platform.select({
            ios: {
                paddingHorizontal: 60,
                flex: undefined,
                width: '100%',
                position: 'absolute',
                left: 16,
                bottom: 0,
                zIndex: 1,
            },
        }),
    },
    leftAction: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    leftContainer: {
        height: '100%',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                paddingLeft: 16,
                zIndex: 5,
                position: 'absolute',
                bottom: 0,
            },
        }),
    },
    rightContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        height: '100%',
        justifyContent: 'flex-end',
        ...Platform.select({
            ios: {
                right: 16,
                bottom: 0,
                position: 'absolute',
                zIndex: 2,
            },
        }),
    },
    rightIcon: {
        marginLeft: 10,
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
    onTitlePress,
    rightButtons,
    scrollValue,
    showBackButton = true,
    subtitle,
    subtitleCompanion,
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

        const largeTitleLabelHeight = 60;
        const barHeight = (largeHeight - defaultHeight) - largeTitleLabelHeight;
        const val = (scrollValue?.value ?? 0);
        const showDuration = 200;
        const hideDuration = 50;
        const duration = val >= barHeight ? showDuration : hideDuration;
        const opacityValue = val >= barHeight ? 1 : 0;
        return {
            opacity: withTiming(opacityValue, {duration}),
        };
    }, [defaultHeight, largeHeight, isLargeTitle, hasSearch]);

    const containerStyle = useMemo(() => {
        return [styles.container, {height: defaultHeight + top, paddingTop: top}];
    }, [defaultHeight, theme]);

    const additionalTitleStyle = useMemo(() => ({
        marginLeft: Platform.select({android: showBackButton && !leftComponent ? 20 : 0}),
    }), [leftComponent, showBackButton, theme]);

    return (
        <Animated.View style={containerStyle}>
            {showBackButton &&
            <Animated.View style={styles.leftContainer}>
                <TouchableWithFeedback
                    borderlessRipple={true}
                    onPress={onBackPress}
                    rippleRadius={20}
                    type={Platform.select({android: 'native', default: 'opacity'})}
                    testID='navigation.header.back'
                    hitSlop={hitSlop}
                >
                    <Animated.View style={styles.leftAction}>
                        <CompassIcon
                            size={24}
                            name={Platform.select({android: 'arrow-left', ios: 'arrow-back-ios'})!}
                            color={theme.sidebarHeaderTextColor}
                        />
                        {leftComponent}
                    </Animated.View>
                </TouchableWithFeedback>
            </Animated.View>
            }
            <Animated.View style={[styles.titleContainer, additionalTitleStyle]}>
                <TouchableWithFeedback
                    disabled={!onTitlePress}
                    onPress={onTitlePress}
                    type='opacity'
                >
                    <View style={styles.centered}>
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
                        {!isLargeTitle && Boolean(subtitle || subtitleCompanion) &&
                        <View style={styles.subtitleContainer}>
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={styles.subtitle}
                                testID='navigation.header.subtitle'
                            >
                                {subtitle}
                            </Text>
                            {subtitleCompanion}
                        </View>
                        }
                    </View>
                </TouchableWithFeedback>
            </Animated.View>
            <Animated.View style={styles.rightContainer}>
                {Boolean(rightButtons?.length) &&
                rightButtons?.map((r, i) => (
                    <TouchableWithFeedback
                        key={r.iconName}
                        borderlessRipple={r.borderless === undefined ? true : r.borderless}
                        hitSlop={rightButtonHitSlop}
                        onPress={r.onPress}
                        rippleRadius={r.rippleRadius || 20}
                        type={r.buttonType || Platform.select({android: 'native', default: 'opacity'})}
                        style={i > 0 && styles.rightIcon}
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

export default React.memo(Header);

