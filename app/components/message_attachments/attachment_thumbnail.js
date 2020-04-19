// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {StyleSheet, View} from 'react-native';
import PropTypes from 'prop-types';
import FastImage from 'react-native-fast-image';

import {isTrustedHost} from 'app/utils/network';

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
                <FastImage
                    source={{uri}}
                    resizeMode='contain'
                    resizeMethod='scale'
                    style={style.image}
                    trustSSL={isTrustedHost()}
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
