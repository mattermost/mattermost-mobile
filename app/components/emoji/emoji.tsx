// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
} from 'react-native';
import FastImage, {ImageStyle} from 'react-native-fast-image';

const assetImages = new Map([['mattermost.png', require('@assets/images/emojis/mattermost.png')]]);

type Props = {

    /*
         * Emoji text name.
         */
    emojiName: string;

    /*
     * Image URL for the emoji.
     */
    imageUrl: string;

    /*
     * asset name in case it is bundled with the app
     */
    assetImage: string;

    /*
     * Set if this is a custom emoji.
     */
    isCustomEmoji: boolean;

    /*
     * Set to render only the text and no image.
     */
    displayTextOnly?: boolean;
    literal?: string;
    size?: number;
    textStyle?: StyleProp<TextStyle>;
    unicode?: string;
    customEmojiStyle?: StyleProp<ImageStyle>;
    testID?: string;
}

const Emoji: React.FC<Props> = (props: Props) => {
    const {
        customEmojiStyle,
        displayTextOnly,
        imageUrl,
        assetImage,
        literal,
        unicode,
        testID,
        textStyle,
    } = props;

    let size = props.size;
    let fontSize = size;
    if (!size && textStyle) {
        const flatten = StyleSheet.flatten(textStyle);
        fontSize = flatten.fontSize;
        size = fontSize;
    }

    if (displayTextOnly) {
        return (
            <Text
                style={textStyle}
                testID={testID}
            >
                {literal}
            </Text>);
    }

    const width = size;
    const height = size;

    if (unicode && !imageUrl) {
        const codeArray = unicode.split('-');
        const code = codeArray.reduce((acc, c) => {
            return acc + String.fromCodePoint(parseInt(c, 16));
        }, '');

        return (
            <Text
                style={[textStyle, {fontSize: size}]}
                testID={testID}
            >
                {code}
            </Text>
        );
    }

    if (assetImage) {
        const key = Platform.OS === 'android' ? (`${assetImage}-${height}-${width}`) : null;

        const image = assetImages.get(assetImage);
        if (!image) {
            return null;
        }
        return (
            <FastImage
                key={key}
                source={image}
                style={[customEmojiStyle, {width, height}]}
                resizeMode={FastImage.resizeMode.contain}
                testID={testID}
            />
        );
    }

    if (!imageUrl) {
        return null;
    }

    // Android can't change the size of an image after its first render, so
    // force a new image to be rendered when the size changes
    const key = Platform.OS === 'android' ? (`${imageUrl}-${height}-${width}`) : null;

    return (
        <FastImage
            key={key}
            style={[customEmojiStyle, {width, height}]}
            source={{uri: imageUrl}}
            resizeMode={FastImage.resizeMode.contain}
            testID={testID}
        />
    );
};

Emoji.defaultProps = {
    literal: '',
    imageUrl: '',
    isCustomEmoji: false,
};

export default Emoji;
