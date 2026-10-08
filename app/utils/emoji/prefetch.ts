// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage, type ImageSource} from 'expo-image';

import NetworkPostureManager from '@managers/network_posture_manager';
import {logDebug} from '@utils/log';
import {urlSafeBase64Encode} from '@utils/security';

import type {Client} from '@client/rest';

export function prefetchCustomEmojiImages(client: Client, emojis: CustomEmoji[]) {
    if (!NetworkPostureManager.getGates(client.apiClient.baseUrl).autoLoadImages) {
        logDebug('prefetchCustomEmojiImages: skipped by network posture');
        return;
    }

    logDebug(`Prefetching ${emojis.length} custom emoji images`);

    const cachePath = urlSafeBase64Encode(client.apiClient.baseUrl);
    ExpoImage.prefetch(emojis.map((ce) => {
        const source: ImageSource = {
            uri: client.getCustomEmojiImageUrl(ce.id),
            cachePath,
            cacheKey: `emoji-${ce.name}`,
        };
        return source;
    }), {cachePolicy: 'disk'});

    // }
}
