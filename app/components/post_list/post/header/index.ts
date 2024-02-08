// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observePost, observePostAuthor, queryPostReplies} from '@queries/servers/post';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import Header from './header';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type HeaderInputProps = {
    differentThreadSequence: boolean;
    post: PostModel;
};

const withHeaderProps = withObservables(
    ['post', 'differentThreadSequence'],
    ({post, database, differentThreadSequence}: WithDatabaseArgs & HeaderInputProps) => {
        const preferences = queryDisplayNamePreferences(database).
            observeWithColumns(['value']);
        const author = observePostAuthor(database, post);
        const enablePostUsernameOverride = observeConfigBooleanValue(database, 'EnablePostUsernameOverride');
        const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')));
        const teammateNameDisplay = observeTeammateNameDisplay(database);
        const commentCount = queryPostReplies(database, post.rootId || post.id).observeCount();
        const isCustomStatusEnabled = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');
        const rootPostAuthor = differentThreadSequence ? observePost(database, post.rootId).pipe(switchMap((root) => {
            if (root) {
                return observeUser(database, root.userId);
            }

            return of$(null);
        })) : of$(null);

        return {
            author,
            commentCount,
            enablePostUsernameOverride,
            isCustomStatusEnabled,
            isMilitaryTime,
            rootPostAuthor,
            teammateNameDisplay,
            hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
        };
    });

export default withDatabase(withHeaderProps(Header));
