// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage, type ImageSource} from 'expo-image';

import {logDebug} from '@utils/log';
import {urlSafeBase64Encode} from '@utils/security';

import type {Client} from '@client/rest';

export function prefetchCustomEmojiImages(client: Client, emojis: CustomEmoji[]) {
    if (!emojis.length) {
        return;
    }
    logDebug(`Prefetching ${emojis.length} custom emoji images`);

    try {
        const cachePath = urlSafeBase64Encode(client.apiClient.baseUrl);
        const sources: ImageSource[] = emojis.map((ce) => {
            const source: ImageSource = {
                uri: client.getCustomEmojiImageUrl(ce.id),
                cachePath,
                cacheKey: `emoji-${ce.name}`,
            };
            return source;
        });
        const prefetchPromise = Promise.resolve(ExpoImage.prefetch(sources, {cachePolicy: 'disk'}));
        prefetchPromise.catch(() => {
            // Fallback for native builds without prefetchWithSources (e.g. Android
            // before the expo-image patch is rebuilt): prefetch plain URLs so we
            // don't leave an unhandled rejection.
            Promise.resolve(ExpoImage.prefetch(sources.map((s) => s.uri!))).catch(() => {
                // Prefetch is best-effort; ignore failures.
            });
        });
    } catch {
        // Prefetch is best-effort; never let it throw.
    }
}
