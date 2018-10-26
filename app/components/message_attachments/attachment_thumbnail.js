// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import PropTypes from 'prop-types';

export default class AttachmentThumbnail extends PureComponent {
    static propTypes = {
        url: PropTypes.string,
    };

    render() {
        const {url: uri} = this.props;

        if (!uri) {
            return null;
        }

        return (
            <View style={style.container}>
                <Image
                    source={{uri}}
                    resizeMode='contain'
                    resizeMethod='scale'
                    style={style.image}
                />
            </View>
        );
    }
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
