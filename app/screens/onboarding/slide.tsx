// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View, useWindowDimensions} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    item: any;
    theme: Theme;
    scrollX: any;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        fontWeight: '600',
        fontSize: 40,
        marginBottom: 5,
        height: 100,
        color: theme.centerChannelColor,
        textAlign: 'center',
    },
    description: {
        fontWeight: '400',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        height: 80,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'Regular'),
    },
    image: {
        justifyContent: 'center',
        height: 60,
        maxHeight: 120,
        width: 50,
    },
    itemContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

const SlideItem = ({theme, item, scrollX}: Props) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const SvgImg = item.image;

    return (
        <View style={[styles.itemContainer, {width}]}>
            <SvgImg
                style={[styles.image, {width, resizeMode: 'contain'}]}
            />
            <View style={{flex: 0.3}}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );
};

export default SlideItem;
