// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    PixelRatio,
    Platform,
    StyleSheet,
    Text
} from 'react-native';
import FastImage from 'react-native-fast-image';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {EmojiIndicesByAlias, Emojis} from 'app/utils/emojis';

import {Client4} from 'mattermost-redux/client';

const scaleEmojiBasedOnDevice = (size) => {
    if (Platform.OS === 'ios') {
        return size * 1.1; // slightly larger emojis look better on ios
    }
    return size * PixelRatio.get();
};

export default class Emoji extends React.PureComponent {
    static propTypes = {
        customEmojis: PropTypes.object,
        emojiName: PropTypes.string.isRequired,
        literal: PropTypes.string,
        size: PropTypes.number,
        textStyle: CustomPropTypes.Style,
        token: PropTypes.string.isRequired
    };

    static defaultProps = {
        customEmojis: new Map(),
        literal: ''
    };

    constructor(props) {
        super(props);

        this.state = {
            ...this.getImageUrl(props),
            originalWidth: 0,
            originalHeight: 0
        };
    }

    componentWillMount() {
        this.mounted = true;
        if (this.state.imageUrl && this.state.isCustomEmoji) {
            this.updateImageHeight(this.state.imageUrl);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.customEmojis !== this.props.customEmojis || nextProps.emojiName !== this.props.emojiName) {
            this.setState({
                ...this.getImageUrl(nextProps),
                originalWidth: 0,
                originalHeight: 0
            });
        }
    }

    componentWillUpdate(nextProps, nextState) {
        if (nextState.imageUrl !== this.state.imageUrl && nextState.imageUrl && nextState.isCustomEmoji) {
            this.updateImageHeight(nextState.imageUrl);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getImageUrl = (props = this.props) => {
        const emojiName = props.emojiName;

        let imageUrl = '';
        let isCustomEmoji = false;
        if (EmojiIndicesByAlias.has(emojiName)) {
            const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)];

            imageUrl = Client4.getSystemEmojiImageUrl(emoji.filename);
        } else if (props.customEmojis.has(emojiName)) {
            const emoji = props.customEmojis.get(emojiName);

            imageUrl = Client4.getCustomEmojiImageUrl(emoji.id);
            isCustomEmoji = true;
        }

        return {
            imageUrl,
            isCustomEmoji
        };
    }

    updateImageHeight = (imageUrl) => {
        Image.getSize(imageUrl, (originalWidth, originalHeight) => {
            if (this.mounted) {
                this.setState({
                    originalWidth,
                    originalHeight
                });
            }
        });
    }

    render() {
        const {
            literal,
            textStyle,
            token
        } = this.props;

        let size = this.props.size;
        let fontSize = size;
        if (!size && textStyle) {
            const flatten = StyleSheet.flatten(textStyle);
            fontSize = flatten.fontSize;
            size = scaleEmojiBasedOnDevice(fontSize);
        }

        if (!this.state.imageUrl) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        let ImageComponent;
        if (Platform.OS === 'android') {
            ImageComponent = Image;
        } else {
            ImageComponent = FastImage;
        }

        const source = {
            uri: this.state.imageUrl,
            headers: {
                Authorization: `Bearer ${token}`
            }
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
