// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
} from 'react-native';
import FastImage, {ImageStyle} from 'react-native-fast-image';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {fetchCustomEmojiInBatch} from '@actions/remote/custom_emoji';
import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';
import {queryCustomEmojisByName} from '@queries/servers/custom_emoji';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {EmojiIndicesByAlias, Emojis} from '@utils/emoji';
import {isUnicodeEmoji} from '@utils/emoji/helpers';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

const assetImages = new Map([['mattermost.png', require('@assets/images/emojis/mattermost.png')]]);

type Props = {
    emojiName: string;
    displayTextOnly?: boolean;
    literal?: string;
    size?: number;
    textStyle?: StyleProp<TextStyle>;
    customEmojiStyle?: StyleProp<ImageStyle>;
    customEmojis: CustomEmojiModel[];
    testID?: string;
}

const Emoji = (props: Props) => {
    const {
        customEmojis,
        customEmojiStyle,
        displayTextOnly,
        emojiName,
        literal = '',
        testID,
        textStyle,
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
        } else if (name && !isUnicodeEmoji(name)) {
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
        const code = codeArray.reduce((acc: string, c: string) => {
            return acc + String.fromCodePoint(parseInt(c, 16));
        }, '');

        return (
            <Text
                style={[textStyle, {fontSize: size, color: '#000'}]}
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
