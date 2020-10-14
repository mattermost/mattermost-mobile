// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    StyleSheet,
} from 'react-native';

import brokenImageIcon from '@assets/images/icons/brokenimage.png';
import ProgressiveImage from '@components/progressive_image';
import {Client4} from '@mm-redux/client';
import {changeOpacity} from '@utils/theme';

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
        inViewPort: PropTypes.bool,
    };

    static defaultProps = {
        resizeMode: 'cover',
        resizeMethod: 'resize',
    };

    state = {
        failed: false,
    };

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

    handleError = () => {
        this.setState({failed: true});
    }

    imageProps = (file) => {
        const imageProps = {};
        const {failed} = this.state;
        const {inViewPort} = this.props;
        if (failed) {
            imageProps.defaultSource = brokenImageIcon;
        } else if (file.localPath) {
            imageProps.defaultSource = {uri: file.localPath};
        } else if (file.id) {
            imageProps.thumbnailUri = Client4.getFileThumbnailUrl(file.id);
            imageProps.imageUri = Client4.getFilePreviewUrl(file.id);
            imageProps.miniPreview = file.mini_preview;
            imageProps.inViewPort = inViewPort;
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
                        tintDefaultSource={!file.localPath && !this.state.failed}
                        filename={file.name}
                        onError={this.handleError}
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

        const imageProps = this.imageProps(file);

        return (
            <View
                ref={this.handleCaptureRef}
                style={style.fileImageWrapper}
            >
                {this.boxPlaceholder()}
                <ProgressiveImage
                    style={[this.props.isSingleImage ? null : style.imagePreview, imageDimensions]}
                    tintDefaultSource={!file.localPath && !this.state.failed}
                    filename={file.name}
                    onError={this.handleError}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    {...imageProps}
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
        alignItems: 'center',
        borderRadius: 4,
    },
    singleSmallImageWrapper: {
        height: SMALL_IMAGE_MAX_HEIGHT,
        width: SMALL_IMAGE_MAX_WIDTH,
        overflow: 'hidden',
    },
});
