// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type CategoryModel from '@typings/database/models/servers/category';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        marginTop: 12,
    },
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
    },
}));

type Props = {
    category: CategoryModel;
    hasChannels: boolean;
}

const CategoryHeader = ({category, hasChannels}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // Hide favs if empty
    if (!hasChannels && category.type === 'favorites') {
        return (<></>);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>
                {category.displayName.toUpperCase()}
            </Text>
        </View>
    );
};

export default CategoryHeader;
