// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    PixelRatio,
    Platform,
    StyleSheet,
    Text,
} from 'react-native';
import FastImage from 'react-native-fast-image';

import CustomPropTypes from 'app/constants/custom_prop_types';

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
        token: PropTypes.string.isRequired,
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
            originalWidth: 0,
            originalHeight: 0,
        };
    }

    componentWillMount() {
        this.mounted = true;
        if (!this.props.displayTextOnly && this.props.imageUrl && this.props.isCustomEmoji) {
            this.updateImageHeight(this.props.imageUrl);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.emojiName !== this.props.emojiName) {
            this.setState({
                originalWidth: 0,
                originalHeight: 0,
            });
        }

        if (!nextProps.displayTextOnly && nextProps.imageUrl && nextProps.isCustomEmoji &&
                nextProps.imageUrl !== this.props.imageUrl) {
            this.updateImageHeight(nextProps.imageUrl);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    updateImageHeight = (imageUrl) => {
        Image.getSize(imageUrl, (originalWidth, originalHeight) => {
            if (this.mounted) {
                this.setState({
                    originalWidth,
                    originalHeight,
                });
            }
        });
    }

    render() {
        const {
            literal,
            textStyle,
            token,
            imageUrl,
            displayTextOnly,
        } = this.props;

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

        const source = {
            uri: imageUrl,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

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

        let ImageComponent;
        if (Platform.OS === 'android') {
            ImageComponent = Image;
        } else {
            ImageComponent = FastImage;
        }

        if (!imageUrl) {
            return (
                <ImageComponent
                    key={key}
                    style={{width, height, marginTop}}
                />
            );
        }

        return (
            <ImageComponent
                key={key}
                style={{width, height, marginTop}}
                source={source}
                onError={this.onError}
            />
        );
    }
}
