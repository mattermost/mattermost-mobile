// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Platform, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import PlusMenu from './plus_menu';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    displayName: string;
    iconPad?: boolean;
    onHeaderPress?: () => void;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    headingStyles: {
        color: theme.sidebarText,
        ...typography('Heading', 700),
    },
    subHeadingStyles: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 50),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chevronButton: {
        marginLeft: 4,
    },
    chevronIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 24,
    },
    plusButton: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        height: 28,
        width: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 18,
    },
}));

const ChannelListHeader = ({canCreateChannels, canJoinChannels, displayName, iconPad, onHeaderPress}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const serverDisplayName = useServerDisplayName();
    const marginLeft = useSharedValue(iconPad ? 44 : 0);
    const styles = getStyles(theme);
    const animatedStyle = useAnimatedStyle(() => ({
        marginLeft: withTiming(marginLeft.value, {duration: 350}),
    }), []);

    useEffect(() => {
        marginLeft.value = iconPad ? 44 : 0;
    }, [iconPad]);

    const onPress = useCallback(() => {
        const renderContent = () => {
            return (
                <PlusMenu
                    canCreateChannels={canCreateChannels}
                    canJoinChannels={canJoinChannels}
                />
            );
        };

        const closeButtonId = 'close-plus-menu';
        let items = 1;
        if (canCreateChannels) {
            items += 1;
        }

        if (canJoinChannels) {
            items += 1;
        }

        bottomSheet({
            closeButtonId,
            renderContent,
            snapPoints: [((items + Platform.select({android: 1, default: 0})) * ITEM_HEIGHT) + (insets.bottom * 2), 10],
            theme,
            title: intl.formatMessage({id: 'home.header.plus_menu', defaultMessage: 'Options'}),
        });
    }, [intl, insets, isTablet, theme]);

    return (
        <Animated.View style={animatedStyle}>
            {Boolean(displayName) &&
            <View style={styles.headerRow}>
                <TouchableWithFeedback
                    onPress={onHeaderPress}
                    type='opacity'
                >
                    <View style={styles.headerRow}>
                        <Text style={styles.headingStyles}>
                            {displayName}
                        </Text>
                        <View style={styles.chevronButton}>
                            <CompassIcon
                                style={styles.chevronIcon}
                                name={'chevron-down'}
                            />
                        </View>
                    </View>
                </TouchableWithFeedback>
                <TouchableWithFeedback
                    onPress={onPress}
                    style={styles.plusButton}
                    type='opacity'
                >
                    <CompassIcon
                        style={styles.plusIcon}
                        name={'plus'}
                    />
                </TouchableWithFeedback>
            </View>
            }
            <Text style={styles.subHeadingStyles}>
                {serverDisplayName}
            </Text>
        </Animated.View>
    );
};

export default ChannelListHeader;
