// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
} from 'react-native';
import FastImage, {ImageStyle} from 'react-native-fast-image';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import NetworkManager from '@init/network_manager';
import {EmojiIndicesByAlias, Emojis} from '@utils/emoji';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

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

    if (EmojiIndicesByAlias.has(emojiName)) {
        const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)!];
        if (emoji.category === 'custom') {
            assetImage = emoji.fileName;
        } else {
            unicode = emoji.image;
        }
    } else {
        const custom = customEmojis.find((ce) => ce.name === emojiName);
        if (custom) {
            try {
                const client = NetworkManager.getClient(serverUrl);
                imageUrl = client.getCustomEmojiImageUrl(custom.id);
            } catch {
                // do nothing
            }
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
            <View style={Platform.select({ios: {flex: 1, justifyContent: 'center'}})}>
                <FastImage
                    key={key}
                    source={image}
                    style={[customEmojiStyle, {width, height}]}
                    resizeMode={FastImage.resizeMode.contain}
                    testID={testID}
                />
            </View>
        );
    }

    if (!imageUrl) {
        return null;
    }

    // Android can't change the size of an image after its first render, so
    // force a new image to be rendered when the size changes
    const key = Platform.OS === 'android' ? (`${imageUrl}-${height}-${width}`) : null;

    return (
        <View style={Platform.select({ios: {flex: 1, justifyContent: 'center'}})}>
            <FastImage
                key={key}
                style={[customEmojiStyle, {width, height}]}
                source={{uri: imageUrl}}
                resizeMode={FastImage.resizeMode.contain}
                testID={testID}
            />
        </View>
    );
};

const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    enableCustomEmoji: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap((config: SystemModel) => of$(config.value.EnableCustomEmoji)),
    ),
}));

const withCustomEmojis = withObservables(['enableCustomEmoji', 'emojiName'], ({enableCustomEmoji, database, emojiName}: WithDatabaseArgs & {enableCustomEmoji: string; emojiName: string}) => {
    const displayTextOnly = enableCustomEmoji !== 'true';

    return {
        displayTextOnly: of$(displayTextOnly),
        customEmojis: database.get(MM_TABLES.SERVER.CUSTOM_EMOJI).query(Q.where('name', emojiName)).observe(),
    };
});

export default withDatabase(withSystemIds(withCustomEmojis(Emoji)));
