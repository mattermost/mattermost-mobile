// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observePost} from '@queries/servers/post';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';

import ShowTranslation from './show_translation';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    postId: string;
}

const enhance = withObservables(['postId'], ({postId, database}: Props) => {
    const post = observePost(database, postId);
    const appsEnabled = observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled');
    const customEmojiNames = queryAllCustomEmojis(database).observe().pipe(
        switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
    );
    const isCRTEnabled = observeIsCRTEnabled(database);
    return {
        post,
        appsEnabled,
        customEmojiNames,
        isCRTEnabled,
    };
});

export default withDatabase(enhance(ShowTranslation));

