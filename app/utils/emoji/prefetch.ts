// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage, type ImageSource} from 'expo-image';

import {logDebug} from '@utils/log';
import {urlSafeBase64Encode} from '@utils/security';

import type {Client} from '@client/rest';

export function prefetchCustomEmojiImages(client: Client, emojis: CustomEmoji[]) {
    logDebug(`Prefetching ${emojis.length} custom emoji images`);

    const cachePath = urlSafeBase64Encode(client.apiClient.baseUrl);
    ExpoImage.prefetch(emojis.map((ce) => {
        const source: ImageSource = {
            uri: client.getCustomEmojiImageUrl(ce.id),
            cachePath,
            cacheKey: `custom-${ce.name}`,
        };
        return source;
    }), {cachePolicy: 'disk'});

    // }
}
