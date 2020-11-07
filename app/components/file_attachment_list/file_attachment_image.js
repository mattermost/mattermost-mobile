// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    StyleSheet,
} from 'react-native';

import ProgressiveImage from '@components/progressive_image';
import {Client4} from '@mm-redux/client';
import {changeOpacity} from '@utils/theme';

import FileAttachmentIcon from './file_attachment_icon';

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
        theme: PropTypes.object,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        isSingleImage: PropTypes.bool,
        imageDimensions: PropTypes.object,
        backgroundColor: PropTypes.string,
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

    handleError = () => {
        this.setState({failed: true});
    }

    imageProps = (file) => {
        const imageProps = {};

        if (file.localPath) {
            imageProps.defaultSource = {uri: file.localPath};
        } else if (file.id) {
            if (file.mini_preview && file.mime_type) {
                imageProps.thumbnailUri = `data:${file.mime_type};base64,${file.mini_preview}`;
            } else {
                imageProps.thumbnailUri = Client4.getFileThumbnailUrl(file.id);
            }
            imageProps.imageUri = Client4.getFilePreviewUrl(file.id);
            imageProps.inViewPort = this.props.inViewPort;
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
                style={[
                    wrapperStyle,
                    style.smallImageBorder,
                    {
                        borderColor: changeOpacity(theme.centerChannelColor, 0.4),
                        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                    },
                ]}
            >
                {this.boxPlaceholder()}
                <View style={style.smallImageOverlay}>
                    <ProgressiveImage
                        id={file.id}
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
        const {failed} = this.state;
        const {
            file,
            imageDimensions,
            resizeMethod,
            resizeMode,
            backgroundColor,
            theme,
        } = this.props;

        if (failed) {
            return (
                <FileAttachmentIcon
                    failed={failed}
                    backgroundColor={backgroundColor}
                    theme={theme}
                />
            );
        }

        if (file.height <= SMALL_IMAGE_MAX_HEIGHT || file.width <= SMALL_IMAGE_MAX_WIDTH) {
            return this.renderSmallImage();
        }

        const imageProps = this.imageProps(file);

        return (
            <View
                style={style.fileImageWrapper}
            >
                {this.boxPlaceholder()}
                <ProgressiveImage
                    id={file.id}
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
