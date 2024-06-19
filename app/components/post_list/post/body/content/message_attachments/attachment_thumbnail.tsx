// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React from 'react';
import {StyleSheet, View} from 'react-native';

type Props = {
    uri: string;
}

const style = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 10,
        top: 10,
    },
    image: {
        height: 45,
        width: 45,
    },
});

const AttachmentThumbnail = ({uri}: Props) => {
    return (
        <View style={style.container}>
            <Image
                source={{uri}}
                contentFit='contain'
                style={style.image}
            />
        </View>
    );
};

export default AttachmentThumbnail;
