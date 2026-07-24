// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {MIN_REQUIRED_VERSION} from '@constants/supported_server';
import {CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION, CUSTOM_PROFILE_ATTRIBUTES_FLAG_REMOVED_VERSION} from '@constants/versions';
import DatabaseManager from '@database/manager';
import {isMinimumServerVersion} from '@utils/helpers';

import {getChannelBookmarksEnabled, observeChannelBookmarksEnabled, observeCustomProfileAttributesEnabled} from './features';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'baseHandler.test.com';
let database: Database;
let operator: ServerDataOperator;

const setConfigs = (configs: Array<{id: string; value: string}>) => operator.handleConfigs({
    configs,
    configsToDelete: [],
    prepareRecordsOnly: false,
});

const setLicensed = (isLicensed: boolean) => operator.handleSystem({
    systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: isLicensed ? 'true' : 'false'}}],
    prepareRecordsOnly: false,
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    database = serverDatabaseAndOperator.database;
    operator = serverDatabaseAndOperator.operator;

    // Channel bookmarks also gate on license; hold it licensed so the shared matrix below isolates the
    // version/flag behavior. The unlicensed case is covered separately.
    await setLicensed(true);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

// The version-gate behavior is shared across the promoted-flag helpers, so run the same matrix for each
// flag through its observe* helper. Flags differ only in their config key and removal version.
describe.each([
    {name: 'ChannelBookmarks', flag: 'FeatureFlagChannelBookmarks', removedVersion: CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION, observeEnabled: observeChannelBookmarksEnabled},
    {name: 'CustomProfileAttributes', flag: 'FeatureFlagCustomProfileAttributes', removedVersion: CUSTOM_PROFILE_ATTRIBUTES_FLAG_REMOVED_VERSION, observeEnabled: observeCustomProfileAttributesEnabled},
])('$name feature-flag compatibility', ({flag, removedVersion, observeEnabled}) => {
    const atRemoval = removedVersion.join('.');
    const olderServer = '10.0.0';

    it('is enabled once the flag is removed, even though it is no longer sent', async () => {
        await setConfigs([{id: 'Version', value: atRemoval}]);
        expect(await firstValueFrom(observeEnabled(database))).toBe(true);
    });

    it('honors the flag on older servers that still send it', async () => {
        await setConfigs([{id: 'Version', value: olderServer}, {id: flag, value: 'true'}]);
        expect(await firstValueFrom(observeEnabled(database))).toBe(true);
    });

    it('is disabled on older servers that do not enable the flag', async () => {
        await setConfigs([{id: 'Version', value: olderServer}]);
        expect(await firstValueFrom(observeEnabled(database))).toBe(false);
    });

    // Once MIN_REQUIRED_VERSION reaches the removal version, every supported server has the flag gone, the
    // gate is always true, and this shim is dead code — delete the helper, constant, and call sites then.
    it('shim is still needed: min supported server predates flag removal', () => {
        expect(isMinimumServerVersion(MIN_REQUIRED_VERSION, ...removedVersion)).toBe(false);
    });
});

// Channel bookmarks additionally gate on license, unlike the other promoted flags. Both variants apply
// the same gate so UI and fetch paths stay consistent.
describe('ChannelBookmarks license gate', () => {
    it('disables both variants on an unlicensed server even when the feature is otherwise enabled', async () => {
        await setConfigs([{id: 'Version', value: CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION.join('.')}]);
        await setLicensed(false);
        expect(await firstValueFrom(observeChannelBookmarksEnabled(database))).toBe(false);
        expect(await getChannelBookmarksEnabled(database)).toBe(false);
    });
});

// getChannelBookmarksEnabled is the async variant used by the channel bookmark action; confirm it applies
// the same version gate as the observe helper.
describe('getChannelBookmarksEnabled (async variant)', () => {
    it('applies the version gate', async () => {
        await setConfigs([{id: 'Version', value: '10.0.0'}]);
        expect(await getChannelBookmarksEnabled(database)).toBe(false);

        await setConfigs([{id: 'Version', value: CHANNEL_BOOKMARKS_FLAG_REMOVED_VERSION.join('.')}]);
        expect(await getChannelBookmarksEnabled(database)).toBe(true);
    });
});
