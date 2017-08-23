// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Image, Platform, Text} from 'react-native';
import FastImage from 'react-native-fast-image';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {EmojiIndicesByAlias, Emojis} from 'app/utils/emojis';

import {Client4} from 'mattermost-redux/client';

export default class Emoji extends React.PureComponent {
    static propTypes = {
        customEmojis: PropTypes.object,
        emojiName: PropTypes.string.isRequired,
        literal: PropTypes.string,
        padding: PropTypes.number,
        size: PropTypes.number.isRequired,
        textStyle: CustomPropTypes.Style,
        token: PropTypes.string.isRequired
    };

    static defaultProps = {
        customEmojis: new Map(),
        literal: '',
        padding: 10
    };

    render() {
        const {
            customEmojis,
            emojiName,
            literal,
            padding,
            size,
            textStyle,
            token
        } = this.props;

        let imageUrl;
        if (EmojiIndicesByAlias.has(emojiName)) {
            const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)];
            imageUrl = Client4.getSystemEmojiImageUrl(emoji.filename);
        } else if (customEmojis.has(emojiName)) {
            const emoji = customEmojis.get(emojiName);
            imageUrl = Client4.getCustomEmojiImageUrl(emoji.id);
        }

        if (!imageUrl) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        let ImageComponent = FastImage;
        const source = {
            uri: imageUrl,
            headers: {
                Authorization: `Bearer ${token}`
            }
        };

        if (Platform.OS === 'android') {
            ImageComponent = Image;
        }

        return (
            <ImageComponent
                style={{width: size, height: size, padding}}
                source={source}
                onError={this.onError}
            />
        );
    }
}
