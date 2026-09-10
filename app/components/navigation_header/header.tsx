// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming, type SharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ChromeIconButton from '@components/chrome/chrome_icon_button';
import CompassIcon from '@components/compass_icon';
import NavigationButton, {type NavigationButtonProps} from '@components/navigation_button';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {CHROME_HEADER_BOTTOM_INSET, CHROME_HEADER_TITLE_GAP, CHROME_HEADER_TOP_INSET, PLATFORM_UI_HEADER_HEIGHT, isPlatformUiIos} from '@constants/platform_ui';
import ViewConstants, {HOME_PADDING} from '@constants/view';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    defaultHeight: number;
    hasSearch: boolean;
    isLargeTitle: boolean;
    heightOffset: number;
    leftComponent?: React.ReactElement;
    onBackPress?: () => void;
    onTitlePress?: () => void;
    rightButtons?: NavigationButtonProps[];
    rightComponent?: React.ReactNode;
    scrollValue?: SharedValue<number>;
    showBackButton?: boolean;
    subtitle?: string;
    subtitleCompanion?: React.ReactElement;
    theme: Theme;
    title?: string;
    titleCompanion?: React.ReactElement;
    titleTestID?: string;
}

const hitSlop = {top: 20, bottom: 20, left: 20, right: 20};
const platformChromeInsets = {
    paddingTop: CHROME_HEADER_TOP_INSET,
    paddingBottom: CHROME_HEADER_BOTTOM_INSET,
};
const platformBarStyle = {height: PLATFORM_UI_HEADER_HEIGHT, ...platformChromeInsets};
const platformChromeStyle = {
    height: PLATFORM_UI_HEADER_HEIGHT,
    ...platformChromeInsets,
};
const PLATFORM_UI_RIGHT_BUTTON_GAP = 12;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    titleContent: {
        alignItems: 'flex-start',
        width: '100%',
    },
    container: {
        alignItems: 'center',
        backgroundColor: theme.sidebarBg,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        ...(isPlatformUiIos() ? HOME_PADDING : {paddingHorizontal: 16}),
        zIndex: 10,
    },
    subtitleContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        left: Platform.select({ios: undefined, default: 3}),
    },
    subtitle: {
        color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
        flexShrink: 1,
        ...typography('Body', 75),
        lineHeight: 12,
        marginBottom: isPlatformUiIos() ? 0 : 8,
        marginTop: 2,
        height: 13,
    },
    titleContainer: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        minWidth: 0,
        overflow: 'hidden',
    },
    leftAction: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    leftContainer: {
        flexShrink: 0,
        height: '100%',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                paddingLeft: isPlatformUiIos() ? 0 : 4,
            },
        }),
    },
    rightContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        height: '100%',
        justifyContent: 'flex-end',
    },
    rightButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isPlatformUiIos() ? PLATFORM_UI_RIGHT_BUTTON_GAP : 6,
    },
    title: {
        color: theme.sidebarHeaderTextColor,
        flexShrink: 1,
        ...typography('Heading', 300),
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        width: '100%',
    },
}));

const Header = ({
    defaultHeight,
    hasSearch,
    isLargeTitle,
    heightOffset,
    leftComponent,
    onBackPress,
    onTitlePress,
    rightButtons,
    rightComponent,
    scrollValue,
    showBackButton = true,
    subtitle,
    subtitleCompanion,
    theme,
    title,
    titleCompanion,
    titleTestID = 'navigation.header.title',
}: Props) => {
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const opacity = useAnimatedStyle(() => {
        if (!isLargeTitle) {
            return {opacity: 1};
        }

        if (hasSearch) {
            return {opacity: 0};
        }

        const barHeight = heightOffset - ViewConstants.LARGE_HEADER_TITLE_HEIGHT;
        const val = (scrollValue?.value || 0);
        const showDuration = 200;
        const hideDuration = 50;
        const duration = val >= barHeight ? showDuration : hideDuration;
        const opacityValue = val >= barHeight ? 1 : 0;
        return {
            opacity: withTiming(opacityValue, {duration}),
        };
    }, [heightOffset, isLargeTitle, hasSearch]);

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        height: defaultHeight,
        paddingTop: isTablet ? 0 : insets.top,
    }), [defaultHeight, isTablet, insets.top]);

    const containerStyle = useMemo(() => (
        [styles.container, containerAnimatedStyle]), [styles, containerAnimatedStyle]);

    const additionalTitleStyle = useMemo(() => {
        if (Platform.OS === 'android') {
            return {
                marginLeft: showBackButton && !leftComponent ? 20 : 0,
                paddingHorizontal: 8,
            };
        }

        return {
            marginLeft: showBackButton ? CHROME_HEADER_TITLE_GAP : 0,
            marginRight: 8,
        };
    }, [leftComponent, showBackButton]);

    return (
        <Animated.View style={containerStyle}>
            {showBackButton &&
            <Animated.View style={[styles.leftContainer, isPlatformUiIos() && platformChromeStyle]}>
                {isPlatformUiIos() ? (
                    <>
                        <ChromeIconButton
                            iconName='arrow-back-ios'
                            onPress={() => onBackPress?.()}
                            testID='navigation.header.back'
                        />
                        {leftComponent}
                    </>
                ) : (
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
                )}
            </Animated.View>
            }
            <Animated.View style={[styles.titleContainer, additionalTitleStyle, isPlatformUiIos() && platformBarStyle]}>
                <View style={styles.titleContent}>
                    <TouchableWithFeedback
                        disabled={!onTitlePress}
                        onPress={onTitlePress}
                        type='opacity'
                    >
                        {!hasSearch &&
                        <View style={styles.titleRow}>
                            <Animated.Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={[styles.title, opacity]}
                                testID={titleTestID}
                            >
                                {title}
                            </Animated.Text>
                            {titleCompanion}
                        </View>
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
                    </TouchableWithFeedback>
                </View>
            </Animated.View>
            <Animated.View style={[styles.rightContainer, isPlatformUiIos() && platformChromeStyle]}>
                {rightComponent}
                {Boolean(rightButtons?.length) &&
                <View style={styles.rightButtonContainer}>
                    {rightButtons?.map((r) => (
                        isPlatformUiIos() && r.iconName ? (
                            <ChromeIconButton
                                key={r.iconName}
                                iconName={r.iconName}
                                onPress={r.onPress}
                                testID={r.testID}
                            />
                        ) : (
                            <NavigationButton
                                key={r.iconName}
                                borderless={r.borderless}
                                iconName={r.iconName}
                                count={r.count}
                                onPress={r.onPress}
                                rippleRadius={r.rippleRadius}
                                testID={r.testID}
                            />
                        )
                    ))}
                </View>
                }
            </Animated.View>
        </Animated.View>
    );
};

export default React.memo(Header);

