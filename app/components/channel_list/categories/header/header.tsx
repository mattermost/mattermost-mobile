// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {collapseCategory} from '@actions/local/category';
import CompassIcon from '@app/components/compass_icon';
import {useServerUrl} from '@app/context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type CategoryModel from '@typings/database/models/servers/category';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
    },
    chevron: {
        paddingTop: 2,
        paddingRight: 2,
        color: changeOpacity(theme.sidebarText, 0.64),
    },
    animatedView: {
        transform: [{rotate: '0deg'}],
        height: 20,
        width: 20,
    },
}));

type Props = {
    category: CategoryModel;
    hasChannels: boolean;
}

const CategoryHeader = ({category, hasChannels}: Props) => {
    // Hooks
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    // Actions
    const toggleCollapse = () => collapseCategory(serverUrl, category.id);

    // Hide favs if empty
    if (!hasChannels && category.type === 'favorites') {
        return (<></>);
    }

    return (
        <TouchableOpacity onPress={toggleCollapse}>
            <View style={styles.container}>
                <CompassIcon
                    name={category.collapsed ? 'chevron-right' : 'chevron-down'}
                    style={styles.chevron}
                />
                <Text style={styles.heading}>
                    {category.displayName.toUpperCase()}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default CategoryHeader;
