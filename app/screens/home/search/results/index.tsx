// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {queryChannelsById} from '@queries/servers/channel';
import {queryPostsById} from '@queries/servers/post';
import {observeLicense, observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import Results from './results';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type enhancedProps = WithDatabaseArgs & {
    postIds: string[];
    fileChannelIds: string[];
}

const sortPosts = (a: PostModel, b: PostModel) => a.createAt - b.createAt;

const enhance = withObservables(['postIds', 'fileChannelIds'], ({database, postIds, fileChannelIds}: enhancedProps) => {
    const posts = queryPostsById(database, postIds).observeWithColumns(['type', 'createAt']).pipe(
        switchMap((pp) => of$(pp.sort(sortPosts))),
    );
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
        posts,
        fileChannels,
        canDownloadFiles,
        publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(Results);
