// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';

import ProgressiveImage from '@components/progressive_image';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {generateId} from '@utils/file';
import {isGifTooLarge, openGalleryAtIndex, calculateDimensions} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {Theme} from '@mm-redux/types/preferences';
import {PostImage} from '@mm-redux/types/posts';
import {FileInfo} from '@mm-redux/types/files';

const VIEWPORT_IMAGE_OFFSET = 100;
const VIEWPORT_IMAGE_CONTAINER_OFFSET = 10;

export type Props = {
    deviceHeight: number;
    deviceWidth: number;
    imageMetadata?: PostImage;
    imageUrl?: string;
    postId?: string;
    theme: Theme;
}

export type State = {
    hasImage: boolean;
    imageUri: string | null;
    originalHeight?: number;
    originalWidth?: number;
    height?: number;
    width?: number;
}

export default class AttachmentImage extends PureComponent<Props, State> {
    private fileId: string;
    private mounted = false;
    private maxImageWidth = 0;

    constructor(props: Props) {
        super(props);

        this.fileId = generateId();
        this.state = {
            hasImage: Boolean(props.imageUrl),
            imageUri: null,
        };
    }

    componentDidMount() {
        this.mounted = true;
        const {imageUrl, imageMetadata} = this.props;

        this.setViewPortMaxWidth();
        if (imageMetadata) {
            this.setImageDimensionsFromMeta(null, imageMetadata);
        }

        if (imageUrl) {
            this.setImageUrl(imageUrl);
        }
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.imageUrl && (prevProps.imageUrl !== this.props.imageUrl)) {
            this.setImageUrl(this.props.imageUrl);
        }
    }

    getFileInfo = () => {
        const {imageUrl, postId} = this.props;
        const {
            imageUri: uri,
            originalHeight,
            originalWidth,
        } = this.state;

        if (!imageUrl) {
            return {
                id: this.fileId,
                post_id: postId,
                uri,
                width: originalWidth,
                height: originalHeight,
            } as FileInfo;
        }

        let filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1, imageUrl.indexOf('?') === -1 ? imageUrl.length : imageUrl.indexOf('?'));
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        const out = {
            id: this.fileId,
            name: filename,
            extension,
            has_preview_image: true,
            post_id: postId,
            uri,
            width: originalWidth,
            height: originalHeight,
        } as FileInfo;
        return out;
    }

    handlePreviewImage = () => {
        const files = [this.getFileInfo()];
        openGalleryAtIndex(0, files);
    };

    setImageDimensions = (imageUri: string | null, dimensions: {width?: number; height?: number;}, originalWidth: number, originalHeight: number) => {
        if (this.mounted) {
            this.setState({
                ...dimensions,
                originalWidth,
                originalHeight,
                imageUri,
            });
        }
    };

    setImageDimensionsFromMeta = (imageUri: string | null, imageMetadata: PostImage) => {
        const dimensions = calculateDimensions(imageMetadata.height, imageMetadata.width, this.maxImageWidth);
        this.setImageDimensions(imageUri, dimensions, imageMetadata.width, imageMetadata.height);
    };

    setImageUrl = (imageURL: string) => {
        const {imageMetadata} = this.props;

        if (imageMetadata) {
            this.setImageDimensionsFromMeta(imageURL, imageMetadata);
        }
    };

    setViewPortMaxWidth = () => {
        const {deviceWidth, deviceHeight} = this.props;
        const viewPortWidth = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        this.maxImageWidth = viewPortWidth - VIEWPORT_IMAGE_OFFSET;
    };

    render() {
        const {imageMetadata, theme} = this.props;
        const {hasImage, height, imageUri, width} = this.state;

        if (!hasImage || isGifTooLarge(imageMetadata)) {
            return null;
        }

        const style = getStyleSheet(theme);

        let progressiveImage;
        if (imageUri) {
            progressiveImage = (
                <ProgressiveImage
                    id={this.fileId}
                    imageStyle={style.attachmentMargin}
                    style={{height, width}}
                    imageUri={imageUri}
                    resizeMode='contain'
                />
            );
        } else {
            progressiveImage = (<View style={{width, height}}/>);
        }

        return (
            <TouchableWithFeedback
                onPress={this.handlePreviewImage}
                style={[style.container, {width: this.maxImageWidth + VIEWPORT_IMAGE_CONTAINER_OFFSET}]}
                type={'none'}
            >
                <View
                    style={[style.imageContainer, {width, height}]}
                >
                    {progressiveImage}
                </View>
            </TouchableWithFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 5,
        },
        imageContainer: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderWidth: 1,
            borderRadius: 2,
            flex: 1,
        },
        attachmentMargin: {
            marginTop: 2.5,
            marginLeft: 2.5,
            marginBottom: 5,
            marginRight: 5,
        },
    };
});
