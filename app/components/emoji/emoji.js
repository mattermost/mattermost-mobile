// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    StyleSheet,
    Text,
} from 'react-native';
import FastImage from 'react-native-fast-image';

import CustomPropTypes from 'app/constants/custom_prop_types';

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
        unicode: PropTypes.string,
        customEmojiStyle: CustomPropTypes.Style,
    };

    static defaultProps = {
        customEmojis: new Map(),
        literal: '',
        imageUrl: '',
        isCustomEmoji: false,
    };

    render() {
        const {
            customEmojiStyle,
            displayTextOnly,
            imageUrl,
            literal,
            unicode,
            textStyle,
        } = this.props;

        let size = this.props.size;
        let fontSize = size;
        if (!size && textStyle) {
            const flatten = StyleSheet.flatten(textStyle);
            fontSize = flatten.fontSize;
            size = fontSize;
        }

        if (displayTextOnly) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        const width = size;
        const height = size;

        // Android can't change the size of an image after its first render, so
        // force a new image to be rendered when the size changes
        const key = Platform.OS === 'android' ? (`${imageUrl}-${height}-${width}`) : null;

        if (unicode && !imageUrl) {
            const codeArray = unicode.split('-');
            const code = codeArray.reduce((acc, c) => {
                return acc + String.fromCodePoint(parseInt(c, 16));
            }, '');

            return (
                <Text style={[textStyle, {fontSize: size}]}>
                    {code}
                </Text>
            );
        }

        if (!imageUrl) {
            return null;
        }

        return (
            <FastImage
                key={key}
                style={[customEmojiStyle, {width, height}]}
                source={{uri: imageUrl}}
                onError={this.onError}
                resizeMode={FastImage.resizeMode.contain}
            />
        );
    }
}
