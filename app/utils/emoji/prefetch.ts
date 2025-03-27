// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage} from 'expo-image';
import {Image, Platform} from 'react-native';

import {logDebug} from '@utils/log';

import type {Client} from '@client/rest';

export function prefetchCustomEmojiImages(client: Client, emojis: CustomEmoji[]) {
    logDebug(`Prefetching ${emojis.length} custom emoji images`);
    if (Platform.OS === 'ios') {
        ExpoImage.prefetch(emojis.map((ce) => client.getCustomEmojiImageUrl(ce.id)), 'disk');
    } else {
        emojis.forEach((ce) => {
            Image.prefetch(client.getCustomEmojiImageUrl(ce.id));
        });
    }
}
