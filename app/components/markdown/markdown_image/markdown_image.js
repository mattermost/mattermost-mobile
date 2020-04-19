// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {
    Clipboard,
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import FastImage from 'react-native-fast-image';

import ImageViewPort from '@components/image_viewport';
import ProgressiveImage from '@components/progressive_image';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {CustomPropTypes} from '@constants';
import EphemeralStore from '@store/ephemeral_store';
import BottomSheet from '@utils/bottom_sheet';
import {calculateDimensions, getViewPortWidth, isGifTooLarge, previewImageAtIndex} from '@utils/images';
import {normalizeProtocol} from '@utils/url';

import mattermostManaged from 'app/mattermost_managed';
import brokenImageIcon from 'assets/images/icons/brokenimage.png';

const ANDROID_MAX_HEIGHT = 4096;
const ANDROID_MAX_WIDTH = 4096;

export default class MarkdownImage extends ImageViewPort {
    static propTypes = {
        children: PropTypes.node,
        imagesMetadata: PropTypes.object,
        linkDestination: PropTypes.string,
        isReplyPost: PropTypes.bool,
        source: PropTypes.string.isRequired,
        errorTextStyle: CustomPropTypes.Style,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        const dimensions = props.imagesMetadata?.[props.source];
        this.state = {
            originalHeight: dimensions?.height || 0,
            originalWidth: dimensions?.width || 0,
            failed: false,
            uri: null,
        };
    }

    componentDidMount() {
        super.componentDidMount();
        this.loadImageSize(this.getSource());
    }

    setImageRef = (ref) => {
        this.imageRef = ref;
    }

    setItemRef = (ref) => {
        this.itemRef = ref;
    }

    getSource = () => {
        let uri = this.props.source;

        if (uri.startsWith('/')) {
            uri = EphemeralStore.currentServerUrl + uri;
        }

        FastImage.preload([{uri}]);
        return uri;
    };

    handleSizeReceived = (width, height) => {
        if (!this.mounted) {
            return;
        }

        if (!width || !height) {
            this.setState({failed: true});
            return;
        }

        this.setState({
            failed: false,
            originalHeight: height,
            originalWidth: width,
        });
    };

    handleSizeFailed = () => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            failed: true,
        });
    };

    handleLinkPress = () => {
        const url = normalizeProtocol(this.props.linkDestination);

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            }
        });
    };

    handleLinkLongPress = async () => {
        const {formatMessage} = this.context.intl;

        const config = mattermostManaged.getCachedConfig();

        if (config?.copyAndPasteProtection !== 'true') {
            const cancelText = formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'});
            const actionText = formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'});
            BottomSheet.showBottomSheetWithOptions({
                options: [actionText, cancelText],
                cancelButtonIndex: 1,
            }, (value) => {
                if (value !== 1) {
                    this.handleLinkCopy();
                }
            });
        }
    };

    handleLinkCopy = () => {
        Clipboard.setString(this.props.linkDestination || this.props.source);
    };

    handlePreviewImage = () => {
        const {
            originalHeight,
            originalWidth,
        } = this.state;
        const link = this.getSource();
        let filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        const files = [{
            caption: filename,
            dimensions: {
                width: originalWidth,
                height: originalHeight,
            },
            source: {link},
            data: {
                localPath: link,
            },
        }];

        previewImageAtIndex([this.itemRef], 0, files);
    };

    loadImageSize = (source) => {
        if (!this.state.originalWidth) {
            Image.getSize(source, this.handleSizeReceived, this.handleSizeFailed);
        }
    };

    render() {
        if (isGifTooLarge(this.props.imagesMetadata?.[this.props.source])) {
            return null;
        }

        let image = null;
        const {originalHeight, originalWidth} = this.state;
        const uri = this.getSource();
        const {height, width} = calculateDimensions(originalHeight, originalWidth, getViewPortWidth(this.props.isReplyPost, this.hasPermanentSidebar()));

        if (width && height) {
            if (Platform.OS === 'android' && (width > ANDROID_MAX_WIDTH || height > ANDROID_MAX_HEIGHT)) {
                // Android has a cap on the max image size that can be displayed

                image = (
                    <Text style={this.props.errorTextStyle}>
                        <FormattedText
                            id='mobile.markdown.image.too_large'
                            defaultMessage='Image exceeds max dimensions of {maxWidth} by {maxHeight}:'
                            values={{
                                maxWidth: ANDROID_MAX_WIDTH,
                                maxHeight: ANDROID_MAX_HEIGHT,
                            }}
                        />
                        {' '}
                        {this.props.children}
                    </Text>
                );
            } else {
                // React Native complains if we try to pass resizeMode as a style
                let source = null;
                if (uri) {
                    source = {uri};
                }

                image = (
                    <TouchableWithFeedback
                        onLongPress={this.handleLinkLongPress}
                        onPress={this.handlePreviewImage}
                        style={{width: 320, height}}
                    >
                        <ProgressiveImage
                            ref={this.setImageRef}
                            defaultSource={source}
                            resizeMode='contain'
                            style={{width: 323, height}}
                        />
                    </TouchableWithFeedback>
                );
            }
        } else if (this.state.failed) {
            image = (
                <FastImage
                    source={brokenImageIcon}
                    style={style.brokenImageIcon}
                />
            );
        }

        if (image && this.props.linkDestination) {
            image = (
                <TouchableWithFeedback
                    onPress={this.handleLinkPress}
                    onLongPress={this.handleLinkLongPress}
                >
                    {image}
                </TouchableWithFeedback>
            );
        }

        return (
            <View
                ref={this.setItemRef}
                style={style.container}
            >
                {image}
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        marginBottom: 5,
    },
    brokenImageIcon: {
        width: 24,
        height: 24,
    },
});
