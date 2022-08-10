// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePost} from '@queries/servers/post';
import {observeConfig, observeCurrentChannelId, observeCurrentUserId, observeLicense} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import Footer from './footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type {GalleryItemType} from '@typings/screens/gallery';

type FooterProps = WithDatabaseArgs & {
    item: GalleryItemType;
}

const enhanced = withObservables(['item'], ({database, item}: FooterProps) => {
    const post = item.postId ? observePost(database, item.postId) : of$(undefined);
    const currentChannelId = observeCurrentChannelId(database);
    const currentUserId = observeCurrentUserId(database);

    const config = observeConfig(database);
    const license = observeLicense(database);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const author = post.pipe(
        switchMap((p) => {
            const id = p?.userId || item.authorId;
            if (id) {
                return observeUser(database, id);
            }

            return of$(undefined);
        }),
    );

    const channel = combineLatest([currentChannelId, post]).pipe(
        switchMap(([cId, p]) => {
            return p?.channel.observe() || observeChannel(database, cId);
        }),
    );
    const enablePostUsernameOverride = config.pipe(switchMap((c) => of$(c?.EnablePostUsernameOverride === 'true')));
    const enablePostIconOverride = config.pipe(switchMap((c) => of$(c?.EnablePostIconOverride === 'true')));
    const enablePublicLink = config.pipe(switchMap((c) => of$(c?.EnablePublicLink === 'true')));
    const enableMobileFileDownload = config.pipe(switchMap((c) => of$(c?.EnableMobileFileDownload !== 'false')));
    const complianceDisabled = license.pipe(switchMap((l) => of$(l?.IsLicensed === 'false' || l?.Compliance === 'false')));
    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        switchMap(([download, compliance]) => of$(compliance || download)),
    );
    const channelName = channel.pipe(switchMap((c: ChannelModel) => of$(c.displayName)));
    const isDirectChannel = channel.pipe(switchMap((c: ChannelModel) => of$(c.type === General.DM_CHANNEL)));

    return {
        author,
        canDownloadFiles,
        channelName,
        currentUserId,
        enablePostIconOverride,
        enablePostUsernameOverride,
        enablePublicLink,
        isDirectChannel,
        post,
        teammateNameDisplay,
    };
});

export default withDatabase(enhanced(Footer));
