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

    state = {
        retry: 0
    }

    // Sometimes the request after a file upload errors out.
    // We'll up to three times to get the image.
    // We have to add a timestamp so fetch will retry the call.
    handleError = () => {
        if (this.state.retry < 3) {
            setTimeout(() => this.setState({
                retry: this.state.retry++,
                timestamp: Date.now()
            }), 100);
        }
    }

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

        const source = {uri: Client.getFilePreviewUrl(file.id, this.state.timestamp)};

        return (
            <View style={[style.fileImageWrapper, {height: wrapperHeight, width: wrapperWidth}]}>
                <Image
                    style={{height: imageHeight, width: imageWidth}}
                    source={source}
                    defaultSource={genericIcon}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={this.handleError}
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
