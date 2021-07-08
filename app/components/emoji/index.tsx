// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import React from 'react';
import {Platform, StyleProp, StyleSheet, Text, TextStyle} from 'react-native';
import FastImage, {ImageStyle} from 'react-native-fast-image';

import {Client4} from '@client/rest';
import {MM_TABLES} from '@constants/database';
import {BuiltInEmojis, EmojiIndicesByAlias, Emojis} from '@utils/emojis';
import {isMinimumServerVersion} from '@utils/helpers';
import {queryCommonSystemValues} from '@queries/servers/system';

import type {Config} from '@typings/database/models/servers/config';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type SystemModel from '@typings/database/models/servers/system';

type EmojiProps = {
    customEmojiStyle?: StyleProp<ImageStyle>;
    emojiName: string;
    emojiRecords: CustomEmojiModel[];
    literal?: string;
    size?: number;
    systemValues: SystemModel[];
    testID?: string;
    textStyle?: StyleProp<TextStyle>;
};

const Emoji = ({
    customEmojiStyle = false,
    emojiName,
    emojiRecords,
    literal = '',
    size,
    systemValues,
    testID,
    textStyle,
}: EmojiProps) => {
    const config = systemValues.find((system: SystemModel) => system.id === 'config') as Config | undefined;
    const currentUserId = systemValues.find((system: SystemModel) => system.id === 'currentUserId') as string | undefined;
    const customEmojis = emojiRecords?.[0];

    //fixme: wrong way of retrieving the server url
    const serverUrl = Client4.getUrl();

    let imageUrl = '';
    let unicode;
    let displayTextOnly = false;
    if (EmojiIndicesByAlias.has(emojiName) || BuiltInEmojis.includes(emojiName)) {
        const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)!];
        unicode = emoji.filename;
        if (BuiltInEmojis.includes(emojiName)) {
            if (serverUrl) {
                imageUrl = Client4.getSystemEmojiImageUrl(emoji.filename);
            } else {
                displayTextOnly = true;
            }
        }
    } else if (customEmojis && serverUrl) {
        imageUrl = Client4.getCustomEmojiImageUrl(customEmojis!.id);
    } else {
        displayTextOnly =
            (

            // fixme: A new table will be created to handle nonExistentEmoji
            // state.entities.emojis.nonExistentEmoji.has(emojiName) ||
                config?.EnableCustomEmoji !== 'true' ||
                config?.ExperimentalEnablePostMetadata === 'true' ||
                !currentUserId ||
                isMinimumServerVersion(Client4.getServerVersion(), 5, 12)
            );
    }

    let emojiSize = size;
    let fontSize = emojiSize;
    if (!emojiSize && textStyle) {
        const flatten = StyleSheet.flatten(textStyle);
        fontSize = flatten.fontSize;
        emojiSize = fontSize;
    }

    if (displayTextOnly) {
        return (
            <Text
                style={textStyle}
                testID={testID}
            >
                {literal}
            </Text>
        );
    }

    const width = emojiSize;
    const height = emojiSize;

    if (unicode && !imageUrl) {
        const codeArray = unicode.split('-');
        const code = codeArray.reduce((acc, c) => {
            return acc + String.fromCodePoint(parseInt(c, 16));
        }, '');

        return (
            <Text
                style={[textStyle, {fontSize: emojiSize}]}
                testID={testID}
            >
                {code}
            </Text>
        );
    }

    if (!imageUrl) {
        return null;
    }

    // Android can't change the emojiSize of an image after its first render, so
    // force a new image to be rendered when the emojiSize changes
    const key = Platform.OS === 'android' ? `${imageUrl}-${height}-${width}` : null;

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

export default withDatabase(withObservables(['emojiName'], ({emojiName, database}: { emojiName: string; database: Database; }) => ({
    systemValues: queryCommonSystemValues(database).observe(),
    emojiRecords: database.collections.get(MM_TABLES.SERVER.CUSTOM_EMOJI).query(Q.where('id', emojiName), Q.or(Q.where('name', emojiName))).observe(),
}))(Emoji));
