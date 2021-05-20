// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from '@components/retriable_fast_image';

import {isValidUrl} from '@utils/url';

type Props = {
    url?: string;
}
export default function AttachmentThumbnail(props: Props) {
    const {url: uri} = props;

    if (!isValidUrl(uri)) {
        return null;
    }

    return (
        <View style={style.container}>
            <FastImage
                id='attachment_thumbnail'
                source={{uri}}
                resizeMode='contain'
                style={style.image}
                renderErrorImage={true}
            />
        </View>
    );
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
