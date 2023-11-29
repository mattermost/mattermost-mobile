// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {
    Image,
    Platform,
    StyleSheet,
    Text,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {fetchCustomEmojiInBatch} from '@actions/remote/custom_emoji';
import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';
import {queryCustomEmojisByName} from '@queries/servers/custom_emoji';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {EmojiIndicesByAlias, Emojis} from '@utils/emoji';
import {isUnicodeEmoji} from '@utils/emoji/helpers';

import type {EmojiProps} from '@typings/components/emoji';
import type {WithDatabaseArgs} from '@typings/database/database';

const assetImages = new Map([['mattermost.png', require('@assets/images/emojis/mattermost.png')]]);

const Emoji = (props: EmojiProps) => {
    const {
        customEmojis,
        imageStyle,
        displayTextOnly,
        emojiName,
        literal = '',
        testID,
        textStyle,
        commonStyle,
    } = props;
    const serverUrl = useServerUrl();
    let assetImage = '';
    let unicode;
    let imageUrl = '';
    const name = emojiName.trim();
    if (EmojiIndicesByAlias.has(name)) {
        const emoji = Emojis[EmojiIndicesByAlias.get(name)!];
        if (emoji.category === 'custom') {
            assetImage = emoji.fileName;
        } else {
            unicode = emoji.image;
        }
    } else {
        const custom = customEmojis.find((ce) => ce.name === name);
        if (custom) {
            try {
                const client = NetworkManager.getClient(serverUrl);
                imageUrl = client.getCustomEmojiImageUrl(custom.id);
            } catch {
                // do nothing
            }
        } else if (name && (name.length > 1 || !isUnicodeEmoji(name))) {
            fetchCustomEmojiInBatch(serverUrl, name);
        }
    }

    let size = props.size;
    let fontSize = size;
    if (!size && textStyle) {
        const flatten = StyleSheet.flatten(textStyle);
        fontSize = flatten.fontSize;
        size = fontSize;
    }

    if (displayTextOnly || (!imageUrl && !assetImage && !unicode)) {
        return (
            <Text
                style={[commonStyle, textStyle]}
                testID={testID}
            >
                {literal}
            </Text>);
    }

    const width = size;
    const height = size;

    if (unicode && !imageUrl) {
        const codeArray = unicode.split('-');
        const code = codeArray.reduce((acc: string, c: string) => {
            return acc + String.fromCodePoint(parseInt(c, 16));
        }, '');

        return (
            <Text
                style={[commonStyle, textStyle, {fontSize: size, color: '#000'}]}
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
            <Image
                key={key}
                source={image}
                style={[commonStyle, imageStyle, {width, height}]}
                resizeMode={'contain'}
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
            style={[commonStyle, imageStyle, {width, height}]}
            source={{uri: imageUrl}}
            resizeMode={FastImage.resizeMode.contain}
            testID={testID}
        />
    );
};

const withCustomEmojis = withObservables(['emojiName'], ({database, emojiName}: WithDatabaseArgs & {emojiName: string}) => {
    const hasEmojiBuiltIn = EmojiIndicesByAlias.has(emojiName);

    const displayTextOnly = hasEmojiBuiltIn ? of$(false) : observeConfigBooleanValue(database, 'EnableCustomEmoji').pipe(
        switchMap((value) => of$(!value)),
    );

    return {
        displayTextOnly,
        customEmojis: hasEmojiBuiltIn ? of$([]) : queryCustomEmojisByName(database, [emojiName]).observe(),
    };
});

export default withDatabase(withCustomEmojis(Emoji));
