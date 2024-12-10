// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type PlaybooksConfigState = {
    pluginEnabled: boolean;

    // version: CallsVersion;
    last_retrieved_at: number;
}

export const DefaultPlaybooksConfig: PlaybooksConfigState = {
    pluginEnabled: false,
    last_retrieved_at: 0,
};
