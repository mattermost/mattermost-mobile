// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Image, Platform, Text} from 'react-native';
import WebImage from 'react-native-web-image';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {EmojiIndicesByAlias, Emojis} from 'app/utils/emojis';

import {Client} from 'mattermost-redux/client';

export default class Emoji extends React.PureComponent {
    static propTypes = {
        customEmojis: PropTypes.object,
        emojiName: PropTypes.string.isRequired,
        literal: PropTypes.string,
        padding: PropTypes.number,
        size: PropTypes.number.isRequired,
        textStyle: CustomPropTypes.Style
    }

    static defaultProps = {
        customEmojis: new Map(),
        literal: '',
        padding: 10
    }

    render() {
        const {
            customEmojis,
            emojiName,
            literal,
            padding,
            size,
            textStyle
        } = this.props;

        let imageUrl;
        if (EmojiIndicesByAlias.has(emojiName)) {
            const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)];
            imageUrl = Client.getSystemEmojiImageUrl(emoji.filename);
        } else if (customEmojis.has(emojiName)) {
            const emoji = customEmojis.get(emojiName);
            imageUrl = Client.getCustomEmojiImageUrl(emoji.id);
        }

        if (!imageUrl) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        let ImageComponent = WebImage;
        if (Platform.OS === 'android') {
            ImageComponent = Image;
        }

        return (
            <ImageComponent
                style={{width: size, height: size, padding}}
                source={{uri: imageUrl}}
            />
        );
    }
}
