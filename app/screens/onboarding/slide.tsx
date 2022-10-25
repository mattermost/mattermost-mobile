// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View, useWindowDimensions} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    item: any;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        fontWeight: '800',
        fontSize: 28,
        marginBottom: 10,
        color: theme.centerChannelColor,
        textAlign: 'center',
    },
    description: {
        fontWeight: '300',
        textAlign: 'center',
        paddingHorizontal: 64,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'Regular'),
    },
    image: {
        flex: 0.7,
        justifyContent: 'center',
    },
    itemContainer: {
        flex: 1,
    },
}));

const SlideItem = ({theme, item}: Props) => {
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
