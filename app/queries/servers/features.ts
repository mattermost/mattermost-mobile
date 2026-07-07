// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION, CUSTOM_PROFILE_ATTRIBUTES_FLAG_REMOVED_VERSION, GM_AS_DM_VERSION} from '@constants/versions';
import {isMinimumServerVersion} from '@utils/helpers';

import {getConfigValue, observeConfigValue} from './system';

import type {Database} from '@nozbe/watermelondb';

export const observeHasGMasDMFeature = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v, ...GM_AS_DM_VERSION))),
    );
};

// A feature flag (MM-69218) is eventually removed from the client config, at which point the server
// stops sending it. `removedVersion` is the server version where that happens: at or above it the flag is
// gone and the feature takes its retired value `defaultValue` — true for a flag promoted to default-on,
// false for a flag retired while still default-off. Below that version the flag is still sent (or the
// feature predates it entirely), so honor the flag value.
const isFeatureFlagEnabled = (version: string | undefined, flag: string | undefined, removedVersion: number[], defaultValue: boolean): boolean => {
    if (isMinimumServerVersion(version, ...removedVersion)) {
        return defaultValue;
    }
    return flag === 'true';
};

const observeFeatureFlagWithVersion = (database: Database, flag: keyof ClientConfig, removedVersion: number[], defaultValue: boolean) => {
    return combineLatest([
        observeConfigValue(database, 'Version'),
        observeConfigValue(database, flag),
    ]).pipe(
        switchMap(([version, value]) => of$(isFeatureFlagEnabled(version, value, removedVersion, defaultValue))),
        distinctUntilChanged(),
    );
};

const getFeatureFlagWithVersion = async (database: Database, flag: keyof ClientConfig, removedVersion: number[], defaultValue: boolean) => {
    const [version, value] = await Promise.all([
        getConfigValue(database, 'Version'),
        getConfigValue(database, flag),
    ]);
    return isFeatureFlagEnabled(version, value, removedVersion, defaultValue);
};

export const observeChannelBookmarksEnabled = (database: Database) => {
    return observeFeatureFlagWithVersion(database, 'FeatureFlagChannelBookmarks', CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION, true);
};

export const getChannelBookmarksEnabled = (database: Database) => {
    return getFeatureFlagWithVersion(database, 'FeatureFlagChannelBookmarks', CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION, true);
};

export const observeCustomProfileAttributesEnabled = (database: Database) => {
    return observeFeatureFlagWithVersion(database, 'FeatureFlagCustomProfileAttributes', CUSTOM_PROFILE_ATTRIBUTES_FLAG_REMOVED_VERSION, true);
};
