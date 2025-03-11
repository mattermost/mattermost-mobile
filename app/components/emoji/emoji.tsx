// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {Image as ExpoImage} from 'expo-image';
import React from 'react';
import {Image, Platform, StyleSheet, Text} from 'react-native';
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

    const key = (`${assetImage}-${height}-${width}`);
    if (assetImage) {
        const image = assetImages.get(assetImage);
        if (!image) {
            return null;
        }

        return Platform.select({
            ios: (
                <ExpoImage
                    source={image}
                    style={[commonStyle, imageStyle, {width, height}]}
                    contentFit='contain'
                    testID={testID}
                    recyclingKey={key}
                />
            ),
            android: (
                <Image
                    key={key}
                    source={image}
                    style={[commonStyle, imageStyle, {width, height}]}
                    resizeMode='contain'
                    testID={testID}
                />
            ),
        });
    }

    if (!imageUrl) {
        return null;
    }

    return Platform.select({
        ios: (
            <ExpoImage
                style={[commonStyle, imageStyle, {width, height}]}
                source={{uri: imageUrl}}
                contentFit='contain'
                testID={testID}
                recyclingKey={key}
                cachePolicy='disk'
                placeholder={require('@assets/images/thumb.png')}
                placeholderContentFit='contain'
            />
        ),
        android: (
            <Image
                source={{uri: imageUrl, cache: 'force-cache'}}
                style={[commonStyle, imageStyle, {width, height}]}
                resizeMode='contain'
                testID={testID}
                key={key}
                defaultSource={require('@assets/images/thumb.png')}
            />
        ),
    });
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
