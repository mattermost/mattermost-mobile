// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    PropTypes,
    PureComponent
} from 'react';
import {
    View,
    Image,
    StyleSheet
} from 'react-native';

import Client from 'mattermost-redux/client';

import genericIcon from 'assets/images/icons/generic.png';

export default class FileAttachmentPreview extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        imageHeight: PropTypes.number,
        imageWidth: PropTypes.number,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number
    };

    static defaultProps = {
        imageHeight: 100,
        imageWidth: 100,
        resizeMode: 'cover',
        resizeMethod: 'resize',
        wrapperHeigh: 100,
        wrapperWidth: 100
    };

    render() {
        const {
            file,
            imageHeight,
            imageWidth,
            resizeMethod,
            resizeMode,
            wrapperHeight,
            wrapperWidth
        } = this.props;

        const source = {uri: Client.getFilePreviewUrl(file.id)};

        return (
            <View style={[style.fileImageWrapper, {height: wrapperHeight, width: wrapperWidth}]}>
                <Image
                    style={{height: imageHeight, width: imageWidth}}
                    source={source}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    defaultSource={genericIcon}
                />
            </View>
        );
    }
}

const style = StyleSheet.create({
    fileImageWrapper: {
        alignItems: 'center',
        justifyContent: 'center'
    }
});
