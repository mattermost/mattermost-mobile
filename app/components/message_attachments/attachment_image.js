// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, TouchableWithoutFeedback, View} from 'react-native';

import ProgressiveImage from 'app/components/progressive_image';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const VIEWPORT_IMAGE_OFFSET = 100;
const VIEWPORT_IMAGE_CONTAINER_OFFSET = 10;

export default class AttachmentImage extends PureComponent {
    static propTypes = {
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        imageUrl: PropTypes.string,
        metadata: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            hasImage: Boolean(props.imageUrl),
            imageUri: null,
        };
    }

    componentDidMount() {
        this.mounted = true;
        const {imageUrl, metadata} = this.props;

        this.setViewPortMaxWidth();
        if (metadata?.images[imageUrl]) {
            const img = metadata.images[imageUrl];
            this.setImageDimensionsFromMeta(null, img);
        }

        if (imageUrl) {
            ImageCacheManager.cache(null, imageUrl, this.setImageUrl);
        }
    }

    handlePreviewImage = () => {
        const {imageUrl, navigator} = this.props;
        const {
            imageUri: uri,
            originalHeight,
            originalWidth,
        } = this.state;

        let filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1, imageUrl.indexOf('?') === -1 ? imageUrl.length : imageUrl.indexOf('?'));
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        const files = [{
            caption: filename,
            dimensions: {
                height: originalHeight,
                width: originalWidth,
            },
            source: {uri},
            data: {
                localPath: uri,
            },
        }];
        previewImageAtIndex(navigator, [this.refs.item], 0, files);
    };

    setImageDimensions = (imageUri, dimensions, originalWidth, originalHeight) => {
        if (this.mounted) {
            this.setState({
                ...dimensions,
                originalWidth,
                originalHeight,
                imageUri,
            });
        }
    };

    setImageDimensionsFromMeta = (imageUri, img) => {
        const dimensions = calculateDimensions(img.height, img.width, this.maxImageWidth);
        this.setImageDimensions(imageUri, dimensions, img.width, img.height);
    };

    setImageUrl = (imageURL) => {
        const {imageUrl: attachmentImageUrl, metadata} = this.props;

        if (metadata?.images[attachmentImageUrl]) {
            this.setImageDimensionsFromMeta(imageURL, metadata.images[attachmentImageUrl]);
            return;
        }

        Image.getSize(imageURL, (width, height) => {
            const dimensions = calculateDimensions(height, width, this.maxImageWidth);
            this.setImageDimensions(imageURL, dimensions, width, height);
        }, () => null);
    };

    setViewPortMaxWidth = () => {
        const {deviceWidth, deviceHeight} = this.props;
        const viewPortWidth = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        this.maxImageWidth = viewPortWidth - VIEWPORT_IMAGE_OFFSET;
    };

    render() {
        const {theme} = this.props;
        const {hasImage, height, imageUri, width} = this.state;

        if (!hasImage) {
            return null;
        }

        const style = getStyleSheet(theme);

        let progressiveImage;
        if (imageUri) {
            progressiveImage = (
                <ProgressiveImage
                    ref='image'
                    style={{height, width}}
                    imageUri={imageUri}
                    resizeMode='contain'
                />
            );
        } else {
            progressiveImage = (<View style={{width, height}}/>);
        }

        return (
            <TouchableWithoutFeedback
                onPress={this.handlePreviewImage}
                style={[style.container, {width: this.maxImageWidth + VIEWPORT_IMAGE_CONTAINER_OFFSET}]}
            >
                <View
                    ref='item'
                    style={[style.imageContainer, {width, height}]}
                >
                    {progressiveImage}
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 5,
        },
        imageContainer: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderWidth: 1,
            borderRadius: 2,
            flex: 1,
            padding: 5,
        },
    };
});
