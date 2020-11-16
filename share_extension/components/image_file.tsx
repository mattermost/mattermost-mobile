// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';

interface ImageFileProps {
    uri: string;
}

const ImageFile = ({uri}: ImageFileProps) => {
    return (
        <View style={styles.container}>
            <FastImage
                source={{uri}}
                resizeMode='cover'
                style={styles.image}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 4,
        height: 48,
        marginRight: 10,
        width: 48,
        overflow: 'hidden',
    },
    image: {
        alignItems: 'center',
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 4,
        height: 46,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 48,
    },
});

export default ImageFile;
