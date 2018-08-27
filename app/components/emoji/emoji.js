// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    PixelRatio,
    Platform,
    StyleSheet,
    Text,
} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import ImageCacheManager from 'app/utils/image_cache_manager';

const scaleEmojiBasedOnDevice = (size) => {
    if (Platform.OS === 'ios') {
        return size * 1.1; // slightly larger emojis look better on ios
    }
    return size * PixelRatio.get();
};

export default class Emoji extends React.PureComponent {
    static propTypes = {

        /*
         * Emoji text name.
         */
        emojiName: PropTypes.string.isRequired,

        /*
         * Image URL for the emoji.
         */
        imageUrl: PropTypes.string.isRequired,

        /*
         * Set if this is a custom emoji.
         */
        isCustomEmoji: PropTypes.bool.isRequired,

        /*
         * Set to render only the text and no image.
         */
        displayTextOnly: PropTypes.bool,
        literal: PropTypes.string,
        size: PropTypes.number,
        textStyle: CustomPropTypes.Style,
    };

    static defaultProps = {
        customEmojis: new Map(),
        literal: '',
        imageUrl: '',
        isCustomEmoji: false,
    };

    constructor(props) {
        super(props);

        this.state = {
            imageUrl: null,
            originalWidth: 0,
            originalHeight: 0,
        };
    }

    componentWillMount() {
        this.mounted = true;
        if (!this.props.displayTextOnly && this.props.imageUrl) {
            ImageCacheManager.cache(this.props.imageUrl, this.props.imageUrl, this.updateImageHeight);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.emojiName !== this.props.emojiName) {
            this.setState({
                imageUrl: null,
                originalWidth: 0,
                originalHeight: 0,
            });
        }

        if (!nextProps.displayTextOnly && nextProps.imageUrl &&
                nextProps.imageUrl !== this.props.imageUrl) {
            ImageCacheManager.cache(nextProps.imageUrl, nextProps.imageUrl, this.updateImageHeight);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    updateImageHeight = (imageUrl) => {
        let prefix = '';
        if (Platform.OS === 'android') {
            prefix = 'file://';
        }

        const uri = `${prefix}${imageUrl}`;
        Image.getSize(uri, (originalWidth, originalHeight) => {
            if (this.mounted) {
                this.setState({
                    imageUrl: uri,
                    originalWidth,
                    originalHeight,
                });
            }
        });
    };

    render() {
        const {
            literal,
            textStyle,
            displayTextOnly,
        } = this.props;
        const {imageUrl} = this.state;

        let size = this.props.size;
        let fontSize = size;
        if (!size && textStyle) {
            const flatten = StyleSheet.flatten(textStyle);
            fontSize = flatten.fontSize;
            size = scaleEmojiBasedOnDevice(fontSize);
        }

        if (displayTextOnly) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        let width = size;
        let height = size;
        let {originalHeight, originalWidth} = this.state;
        originalHeight = scaleEmojiBasedOnDevice(originalHeight);
        originalWidth = scaleEmojiBasedOnDevice(originalWidth);
        if (originalHeight && originalWidth) {
            if (originalWidth > originalHeight) {
                height = (size * originalHeight) / originalWidth;
            } else if (originalWidth < originalHeight) {
                // This may cause text to reflow, but its impossible to add a horizontal margin
                width = (size * originalWidth) / originalHeight;
            }
        }

        let marginTop = 0;
        if (textStyle) {
            // hack to get the vertical alignment looking better
            if (fontSize > 16) {
                marginTop -= 2;
            } else if (fontSize <= 16) {
                marginTop += 1;
            }
        }

        // Android can't change the size of an image after its first render, so
        // force a new image to be rendered when the size changes
        const key = Platform.OS === 'android' ? (height + '-' + width) : null;

        if (!imageUrl) {
            return (
                <Image
                    key={key}
                    style={{width, height, marginTop}}
                />
            );
        }

        return (
            <Image
                key={key}
                style={{width, height, marginTop}}
                source={{uri: imageUrl}}
                onError={this.onError}
            />
        );
    }
}
