// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryPostReplies} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

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
        const preferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).
            observeWithColumns(['value']);
        const author = post.author.observe();
        const enablePostUsernameOverride = observeConfigBooleanValue(database, 'EnablePostUsernameOverride');
        const isTimezoneEnabled = observeConfigBooleanValue(database, 'ExperimentalTimezone');
        const isMilitaryTime = preferences.pipe(map((prefs) => getPreferenceAsBool(prefs, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)));
        const teammateNameDisplay = observeTeammateNameDisplay(database);
        const commentCount = queryPostReplies(database, post.rootId || post.id).observeCount();
        const rootPostAuthor = differentThreadSequence ? post.root.observe().pipe(switchMap((root) => {
            if (root.length) {
                return root[0].author.observe();
            }

            return of$(null);
        })) : of$(null);

        return {
            author,
            commentCount,
            enablePostUsernameOverride,
            isMilitaryTime,
            isTimezoneEnabled,
            rootPostAuthor,
            teammateNameDisplay,
        };
    });

export default withDatabase(withHeaderProps(Header));
