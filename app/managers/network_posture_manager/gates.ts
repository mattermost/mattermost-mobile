// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

export type NetworkPosture = 'offline' | 'congested' | 'fair' | 'good' | 'unknown';

export type FeatureGates = {
    autoLoadImages: boolean;
    postsPageSize: number;
    emitTyping: boolean;
    prefetchChannels: boolean;
};

const CONSTRAINED_GATES: FeatureGates = {
    autoLoadImages: false,
    postsPageSize: 15,
    emitTyping: false,
    prefetchChannels: false,
};

export const getFeatureGates = (posture: NetworkPosture): FeatureGates => {
    switch (posture) {
        case 'good':
            return {
                autoLoadImages: true,
                postsPageSize: General.POST_CHUNK_SIZE,
                emitTyping: true,
                prefetchChannels: true,
            };
        case 'fair':
            return {
                autoLoadImages: true,
                postsPageSize: 30,
                emitTyping: true,
                prefetchChannels: false,
            };

        // Congested, offline, and unknown. Unknown is conservative so a cold
        // start on a contested link does not fan out before the first sample.
        // Offline keeps a non-zero page size because per_page=0 means
        // "server default" to the API.
        default:
            return CONSTRAINED_GATES;
    }
};
