// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import ExpoImage from '@components/expo_image';
import {urlSafeBase64Encode} from '@utils/security';

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
            <ExpoImage
                id={`attachment-thumbnail-${urlSafeBase64Encode(uri)}`}
                source={{uri}}
                contentFit='contain'
                style={style.image}
            />
        </View>
    );
};

export default AttachmentThumbnail;
