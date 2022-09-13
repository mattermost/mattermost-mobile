// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {queryChannelsById} from '@queries/servers/channel';
import {observeLicense, observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import Results from './results';

import type {WithDatabaseArgs} from '@typings/database/database';

type enhancedProps = WithDatabaseArgs & {
    fileChannelIds: string[];
}

const enhance = withObservables(['fileChannelIds'], ({database, fileChannelIds}: enhancedProps) => {
    const fileChannels = queryChannelsById(database, fileChannelIds).observeWithColumns(['displayName']);
    const currentUser = observeCurrentUser(database);

    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload');

    const complianceDisabled = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'false' || lcs?.Compliance === 'false')),
    );

    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        map(([download, compliance]) => compliance || download),
    );

    return {
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone))))),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
        fileChannels,
        canDownloadFiles,
        publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(Results);
