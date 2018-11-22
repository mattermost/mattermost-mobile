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
    TouchableHighlight,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import ProgressiveImage from 'app/components/progressive_image';
import CustomPropTypes from 'app/constants/custom_prop_types';
import mattermostManaged from 'app/mattermost_managed';
import BottomSheet from 'app/utils/bottom_sheet';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import {normalizeProtocol} from 'app/utils/url';

import brokenImageIcon from 'assets/images/icons/brokenimage.png';

const ANDROID_MAX_HEIGHT = 4096;
const ANDROID_MAX_WIDTH = 4096;
const VIEWPORT_IMAGE_OFFSET = 66;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

export default class MarkdownImage extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        imageMetadata: PropTypes.object,
        linkDestination: PropTypes.string,
        isReplyPost: PropTypes.bool,
        navigator: PropTypes.object.isRequired,
        serverURL: PropTypes.string.isRequired,
        source: PropTypes.string.isRequired,
        errorTextStyle: CustomPropTypes.Style,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        const dimensions = props?.imageMetadata?.[props.source];
        this.state = {
            originalHeight: dimensions?.height || 0,
            originalWidth: dimensions?.width || 0,
            failed: false,
            uri: null,
        };

        this.mounted = false;
    }

    componentWillMount() {
        ImageCacheManager.cache(null, this.getSource(), this.setImageUrl);
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.source !== nextProps.source) {
            const dimensions = nextProps?.imageMetadata?.[nextProps.source];

            this.setState({
                failed: false,
                originalHeight: dimensions?.height || 0,
                originalWidth: dimensions?.width || 0,
            });

            // getSource also depends on serverURL, but that shouldn't change while this is mounted
            ImageCacheManager.cache(null, this.getSource(nextProps), this.setImageUrl);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getSource = (props = this.props) => {
        let source = props.source;

        if (source.startsWith('/')) {
            source = props.serverURL + '/' + source;
        }

        return source;
    };

    getViewPortWidth = () => {
        const {deviceHeight, deviceWidth, isReplyPost} = this.props;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        return deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);
    };

    handleSizeReceived = (width, height) => {
        if (!this.mounted) {
            return;
        }

        this.setState({
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

        const config = await mattermostManaged.getLocalConfig();

        if (config.copyAndPasteProtection !== 'true') {
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
            uri,
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
            source: {uri},
            data: {
                localPath: uri,
            },
        }];
        previewImageAtIndex(this.props.navigator, [this.refs.item], 0, files);
    };

    loadImageSize = (source) => {
        if (!this.state.originalWidth) {
            Image.getSize(source, this.handleSizeReceived, this.handleSizeFailed);
        }
    };

    setImageUrl = (imageURL) => {
        const uri = imageURL;

        this.setState({uri});
        this.loadImageSize(uri);
    };

    render() {
        let image = null;
        const {originalHeight, originalWidth, uri} = this.state;
        const {height, width} = calculateDimensions(originalHeight, originalWidth, this.getViewPortWidth());

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
                    <TouchableHighlight
                        onLongPress={this.handleLinkLongPress}
                        onPress={this.handlePreviewImage}
                        style={{width, height}}
                    >
                        <ProgressiveImage
                            ref='image'
                            defaultSource={source}
                            resizeMode='contain'
                            style={{width, height}}
                        />
                    </TouchableHighlight>
                );
            }
        } else if (this.state.failed) {
            image = (
                <Image
                    source={brokenImageIcon}
                    style={style.brokenImageIcon}
                />
            );
        }

        if (image && this.props.linkDestination) {
            image = (
                <TouchableHighlight
                    onPress={this.handleLinkPress}
                    onLongPress={this.handleLinkLongPress}
                >
                    {image}
                </TouchableHighlight>
            );
        }

        return (
            <View
                ref='item'
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
