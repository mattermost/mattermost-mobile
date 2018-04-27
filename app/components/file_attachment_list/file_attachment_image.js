// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    View,
    StyleSheet,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import ProgressiveImage from 'app/components/progressive_image';
import {isGif} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';
import ImageCacheManager from 'app/utils/image_cache_manager';

import thumb from 'assets/images/thumb.png';

const IMAGE_SIZE = {
    Fullsize: 'fullsize',
    Preview: 'preview',
    Thumbnail: 'thumbnail',
};

export default class FileAttachmentImage extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        imageHeight: PropTypes.number,
        imageSize: PropTypes.oneOf([
            IMAGE_SIZE.Fullsize,
            IMAGE_SIZE.Preview,
            IMAGE_SIZE.Thumbnail,
        ]),
        imageWidth: PropTypes.number,
        onCaptureRef: PropTypes.func,
        onCapturePreviewRef: PropTypes.func,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
    };

    static defaultProps = {
        fadeInOnLoad: false,
        imageHeight: 80,
        imageSize: IMAGE_SIZE.Preview,
        imageWidth: 80,
        loading: false,
        resizeMode: 'cover',
        resizeMethod: 'resize',
        wrapperHeight: 80,
        wrapperWidth: 80,
    };

    constructor(props) {
        super(props);

        const {file} = props;
        if (file && file.id) {
            ImageCacheManager.cache(file.name, Client4.getFileThumbnailUrl(file.id), emptyFunction);

            if (isGif(file)) {
                ImageCacheManager.cache(file.name, Client4.getFileUrl(file.id), emptyFunction);
            }
        }

        this.state = {
            opacity: new Animated.Value(0),
            requesting: true,
            retry: 0,
        };
    }

    calculateNeededWidth = (height, width, newHeight) => {
        const ratio = width / height;

        let newWidth = newHeight * ratio;
        if (newWidth < newHeight) {
            newWidth = newHeight;
        }

        return newWidth;
    };

    handleCaptureRef = (ref) => {
        const {onCaptureRef} = this.props;

        if (onCaptureRef) {
            onCaptureRef(ref);
        }
    };

    handleCapturePreviewRef = (ref) => {
        const {onCapturePreviewRef} = this.props;

        if (onCapturePreviewRef) {
            onCapturePreviewRef(ref);
        }
    };

    render() {
        const {
            file,
            imageHeight,
            imageWidth,
            imageSize,
            resizeMethod,
            resizeMode,
            wrapperHeight,
            wrapperWidth,
        } = this.props;

        let height = imageHeight;
        let width = imageWidth;
        let imageStyle = {height, width};
        if (imageSize === IMAGE_SIZE.Preview) {
            height = 100;
            width = this.calculateNeededWidth(file.height, file.width, height) || 100;
            imageStyle = {height, width, position: 'absolute', top: 0, left: 0, borderBottomLeftRadius: 2, borderTopLeftRadius: 2};
        }

        const imageProps = {};
        if (file.localPath) {
            imageProps.defaultSource = {uri: file.localPath};
        } else {
            imageProps.thumbnailUri = Client4.getFileThumbnailUrl(file.id);
            imageProps.imageUri = Client4.getFilePreviewUrl(file.id);
        }

        return (
            <View
                ref={this.handleCaptureRef}
                style={[style.fileImageWrapper, {height: wrapperHeight, width: wrapperWidth, overflow: 'hidden'}]}
            >
                <ProgressiveImage
                    ref={this.handleCapturePreviewRef}
                    style={imageStyle}
                    defaultSource={thumb}
                    tintDefaultSource={!file.localPath}
                    filename={file.name}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    {...imageProps}
                />
            </View>
        );
    }
}

const style = StyleSheet.create({
    fileImageWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomLeftRadius: 2,
        borderTopLeftRadius: 2,
    },
    loaderContainer: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
