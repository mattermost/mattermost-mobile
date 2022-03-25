// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';

import {toggleCollapseCategory} from '@actions/local/category';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type CategoryModel from '@typings/database/models/servers/category';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        marginTop: 12,
        paddingLeft: 2,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
    },
    chevron: {
        marginTop: -2,
        marginRight: 2,
        color: changeOpacity(theme.sidebarText, 0.64),
        width: 20,
        height: 20,
    },
}));

type Props = {
    category: CategoryModel;
    hasChannels: boolean;
}

const AnimatedCompassIcon = Animated.createAnimatedComponent(CompassIcon);

const CategoryHeader = ({category, hasChannels}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const collapsed = useSharedValue(category.collapsed);

    // Action
    const toggleCollapse = useCallback(() => toggleCollapseCategory(serverUrl, category.id), [category.id, serverUrl]);

    const rotate = useDerivedValue(() => {
        return withTiming(collapsed.value ? -90 : 0, {
            duration: 100,
            easing: Easing.linear,
        });
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{rotate: `${rotate.value}deg`}],
        };
    });

    useEffect(() => {
        collapsed.value = category.collapsed;
    }, [category.collapsed]);

    // Hide favs if empty
    if (!hasChannels && category.type === 'favorites') {
        return (null);
    }

    return (
        <TouchableOpacity onPress={toggleCollapse}>
            <View style={styles.container}>
                <AnimatedCompassIcon
                    name={'chevron-down'}
                    style={[styles.chevron, animatedStyle]}
                    size={20}
                />
                <Text style={styles.heading}>
                    {category.displayName.toUpperCase()}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default CategoryHeader;
