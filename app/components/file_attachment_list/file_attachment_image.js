// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
import {changeOpacity} from 'app/utils/theme';

import thumb from 'assets/images/thumb.png';

const SMALL_IMAGE_MAX_HEIGHT = 48;
const SMALL_IMAGE_MAX_WIDTH = 48;

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
        theme: PropTypes.object,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
        isSingleImage: PropTypes.bool,
        imageDimensions: PropTypes.object,
    };

    static defaultProps = {
        resizeMode: 'cover',
        resizeMethod: 'resize',
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

    boxPlaceholder = () => {
        if (this.props.isSingleImage) {
            return null;
        }
        return (<View style={style.boxPlaceholder}/>);
    };

    handleCaptureRef = (ref) => {
        const {onCaptureRef} = this.props;

        if (onCaptureRef) {
            onCaptureRef(ref);
        }
    };

    imageProps = (file) => {
        const imageProps = {};
        if (file.localPath) {
            imageProps.defaultSource = {uri: file.localPath};
        } else if (file.id) {
            imageProps.thumbnailUri = Client4.getFileThumbnailUrl(file.id);
            imageProps.imageUri = Client4.getFilePreviewUrl(file.id);
        }
        return imageProps;
    };

    renderSmallImage = () => {
        const {file, isSingleImage, resizeMethod, theme} = this.props;

        let wrapperStyle = style.fileImageWrapper;

        if (isSingleImage) {
            wrapperStyle = style.singleSmallImageWrapper;

            if (file.width > SMALL_IMAGE_MAX_WIDTH) {
                wrapperStyle = [wrapperStyle, {width: '100%'}];
            }
        }

        return (
            <View
                ref={this.handleCaptureRef}
                style={[
                    wrapperStyle,
                    style.smallImageBorder,
                    {borderColor: changeOpacity(theme.centerChannelColor, 0.4)},
                ]}
            >
                {this.boxPlaceholder()}
                <View style={style.smallImageOverlay}>
                    <ProgressiveImage
                        style={{height: file.height, width: file.width}}
                        defaultSource={thumb}
                        tintDefaultSource={!file.localPath}
                        filename={file.name}
                        resizeMode={'contain'}
                        resizeMethod={resizeMethod}
                        {...this.imageProps(file)}
                    />
                </View>
            </View>
        );
    };

    render() {
        const {
            file,
            imageDimensions,
            resizeMethod,
            resizeMode,
        } = this.props;

        if (file.height <= SMALL_IMAGE_MAX_HEIGHT || file.width <= SMALL_IMAGE_MAX_WIDTH) {
            return this.renderSmallImage();
        }

        return (
            <View
                ref={this.handleCaptureRef}
                style={style.fileImageWrapper}
            >
                {this.boxPlaceholder()}
                <ProgressiveImage
                    style={[this.props.isSingleImage ? null : style.imagePreview, imageDimensions]}
                    defaultSource={thumb}
                    tintDefaultSource={!file.localPath}
                    filename={file.name}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    {...this.imageProps(file)}
                />
            </View>
        );
    }
}

const style = StyleSheet.create({
    imagePreview: {
        ...StyleSheet.absoluteFill,
    },
    fileImageWrapper: {
        borderRadius: 5,
        overflow: 'hidden',
    },
    boxPlaceholder: {
        paddingBottom: '100%',
    },
    smallImageBorder: {
        borderWidth: 1,
        borderRadius: 5,
    },
    smallImageOverlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        borderRadius: 4,
    },
    loaderContainer: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
    },
    singleSmallImageWrapper: {
        height: SMALL_IMAGE_MAX_HEIGHT,
        width: SMALL_IMAGE_MAX_WIDTH,
        overflow: 'hidden',
    },
});
