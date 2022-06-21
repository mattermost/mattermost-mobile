// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';

import {toggleCollapseCategory} from '@actions/local/category';
import CompassIcon from '@components/compass_icon';
import {CHANNELS_CATEGORY, FAVORITES_CATEGORY, DMS_CATEGORY} from '@constants/categories';
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
        marginLeft: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        textTransform: 'uppercase',
        ...typography('Heading', 75),
    },
    chevron: {
        marginTop: -2,
        marginRight: 2,
        color: changeOpacity(theme.sidebarText, 0.64),
        width: 20,
        height: 20,
    },
    muted: {
        opacity: 0.32,
    },
}));

type Props = {
    category: CategoryModel;
    hasChannels: boolean;
}

const AnimatedCompassIcon = Animated.createAnimatedComponent(CompassIcon);

const CategoryHeader = ({category, hasChannels}: Props) => {
    const {formatMessage} = useIntl();
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
    if (!hasChannels && category.type === FAVORITES_CATEGORY) {
        return (null);
    }

    let displayName = category.displayName;
    switch (category.type) {
        case FAVORITES_CATEGORY:
            displayName = formatMessage({id: 'channel_list.favorites_category', defaultMessage: 'Favorites'});
            break;
        case CHANNELS_CATEGORY:
            displayName = formatMessage({id: 'channel_list.channels_category', defaultMessage: 'Channels'});
            break;
        case DMS_CATEGORY:
            displayName = formatMessage({id: 'channel_list.dms_category', defaultMessage: 'Direct messages'});
            break;
    }

    return (
        <TouchableOpacity
            onPress={toggleCollapse}
            testID={`channel_list.category_header.${category.type}.collapsed.${category.collapsed}`}
        >
            <View style={[styles.container, category.muted ? styles.muted : null]}>
                <AnimatedCompassIcon
                    name={'chevron-down'}
                    style={[styles.chevron, animatedStyle]}
                    size={20}
                />
                <Text
                    style={styles.heading}
                    testID={`channel_list.category_header.${category.type}.display_name`}
                >
                    {displayName}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default CategoryHeader;
