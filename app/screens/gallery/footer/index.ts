// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';

import Footer from './footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type FooterProps = WithDatabaseArgs & {
    item: GalleryItemType;
}

const {CONFIG, CURRENT_CHANNEL_ID, CURRENT_USER_ID, LICENSE} = SYSTEM_IDENTIFIERS;
const {SERVER: {CHANNEL, POST, PREFERENCE, SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables(['item'], ({database, item}: FooterProps) => {
    const post: Observable<PostModel|undefined> =
        item.postId ? database.get<PostModel>(POST).findAndObserve(item.postId) : of$(undefined);

    const currentChannelId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_CHANNEL_ID).pipe(
        switchMap(({value}) => of$(value)),
    );

    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );

    const config = database.get<SystemModel>(SYSTEM).findAndObserve(CONFIG).pipe(
        switchMap(({value}) => of$(value as ClientConfig)),
    );
    const license = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE).pipe(
        switchMap(({value}) => of$(value as ClientLicense)),
    );
    const preferences = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe();
    const teammateNameDisplay = combineLatest([preferences, config, license]).pipe(
        switchMap(([prefs, cfg, lcs]) => of$(getTeammateNameDisplaySetting(prefs, cfg, lcs))),
    );

    const author = post.pipe(
        switchMap((p) => {
            const id = p?.userId || item.authorId;
            if (id) {
                return database.get<UserModel>(USER).findAndObserve(id);
            }

            return of$(undefined);
        }),
    );

    const channel = combineLatest([currentChannelId, post]).pipe(
        switchMap(([cId, p]) => {
            return p?.channel.observe() || database.get<ChannelModel>(CHANNEL).findAndObserve(cId);
        }),
    );
    const enablePostUsernameOverride = config.pipe(switchMap((c) => of$(c.EnablePostUsernameOverride === 'true')));
    const enablePostIconOverride = config.pipe(switchMap((c) => of$(c.EnablePostIconOverride === 'true')));
    const enablePublicLink = config.pipe(switchMap((c) => of$(c.EnablePublicLink === 'true')));
    const enableMobileFileDownload = config.pipe(switchMap((c) => of$(c.EnableMobileFileDownload !== 'false')));
    const complianceDisabled = license.pipe(switchMap((l) => of$(l.IsLicensed === 'false' || l.Compliance === 'false')));
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
