// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeRedactionEnforced, observeRequiredRedactionEpoch} from '@actions/local/redaction';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observeIsChannelAutotranslated} from '@queries/servers/channel';
import {queryFilesForPost} from '@queries/servers/file';
import {observePost} from '@queries/servers/post';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeUser, observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';
import {isAttachmentDecisionCurrent, isPermalinkEmbedRedacted} from '@utils/post';

import PermalinkPreview from './permalink_preview';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const observeHasLinkedPostFiles = (database: Database, p: PostModel | undefined, embedData: PermalinkEmbedData) => {
    // Embed data is recalculated per-user on every channel fetch — trust it over the DB file count.
    if (isPermalinkEmbedRedacted(embedData)) {
        return of$(false);
    }
    if (!p) {
        return of$((embedData?.post?.metadata?.files?.length ?? 0) > 0);
    }
    return queryFilesForPost(database, p.id).observe().pipe(map((files) => files.length > 0));
};

/**
 * The server sanitizes the embed while building the host response, but decides it against the linked
 * post's channel. So the host's stored epoch has to satisfy both channels: a policy change scoped to
 * the linked channel raises only that channel's requirement and must still hide a stale embed.
 */
const observeEmbedRequiredEpoch = (database: Database, host: PostModel | undefined, embedData: PermalinkEmbedData) => {
    if (!host) {
        return of$(0);
    }
    const linkedChannelId = embedData?.channel_id || embedData?.post?.channel_id;
    return combineLatest([
        observeRequiredRedactionEpoch(database, host.channelId),
        linkedChannelId ? observeRequiredRedactionEpoch(database, linkedChannelId) : of$(0),
    ]).pipe(map(([hostEpoch, linkedEpoch]) => Math.max(hostEpoch, linkedEpoch)));
};

type EnhanceProps = WithDatabaseArgs & {
    embedData: PermalinkEmbedData;
    parentPostId?: string;
};

const enhance = withObservables(['embedData', 'parentPostId'], ({database, embedData, parentPostId}: EnhanceProps) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    const currentUser = observeCurrentUser(database);

    const preferences = queryDisplayNamePreferences(database).observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')));

    const userId = embedData?.post?.user_id;
    const author = userId ? observeUser(database, userId) : of$(undefined);

    const post = embedData?.post_id ? observePost(database, embedData.post_id) : of$(undefined);

    const hasLinkedPostFiles = post.pipe(
        switchMap((p) => observeHasLinkedPostFiles(database, p, embedData)),
        distinctUntilChanged(),
    );

    const isOriginPostDeleted = post.pipe(
        switchMap((p) => {
            const deleteAt = embedData?.post?.delete_at ?? 0;
            const initialDeleted = Boolean(deleteAt > 0 || embedData?.post?.state === 'DELETED');
            return of$(p ? p.deleteAt > 0 : initialDeleted);
        }),
        distinctUntilChanged(),
    );

    const hostPost = parentPostId ? observePost(database, parentPostId) : of$(undefined);
    const embedRequiredEpoch = hostPost.pipe(
        switchMap((host) => observeEmbedRequiredEpoch(database, host, embedData)),
        distinctUntilChanged(),
    );

    // No host means nothing vouches for the embed, so it fails closed while enforced.
    const isEmbedRedactionVerified = combineLatest([observeRedactionEnforced(database), embedRequiredEpoch, hostPost]).pipe(
        map(([enforced, requiredEpoch, host]) => (host ? isAttachmentDecisionCurrent(enforced, host.redactionVerifiedEpoch, requiredEpoch, embedData?.post?.metadata?.redacted_file_count ?? 0) : !enforced)),
        distinctUntilChanged(),
    );

    const channelId = embedData?.post?.channel_id;

    const autotranslationsEnabled = channelId ? observeIsChannelAutotranslated(database, channelId) : of$(false);

    return {
        teammateNameDisplay,
        currentUser,
        isMilitaryTime,
        author,
        post,
        hasLinkedPostFiles,
        isOriginPostDeleted,
        autotranslationsEnabled,
        embedRequiredEpoch,
        isEmbedRedactionVerified,
    };
});

export default withDatabase(enhance(PermalinkPreview));
