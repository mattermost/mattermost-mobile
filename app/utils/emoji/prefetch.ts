// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage} from 'expo-image';

import {logDebug} from '@utils/log';

import type {Client} from '@client/rest';

export function prefetchCustomEmojiImages(client: Client, emojis: CustomEmoji[]) {
    logDebug(`Prefetching ${emojis.length} custom emoji images`);

    // Extract URIs from emojis - prefetch only accepts string | string[]
    const uris = emojis.map((ce) => client.getCustomEmojiImageUrl(ce.id));
    ExpoImage.prefetch(uris, {cachePolicy: 'disk'});
}
