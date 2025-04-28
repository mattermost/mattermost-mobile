// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {SendButton} from '@components/post_draft/send_button/send_button';
import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeLicense} from '@queries/servers/system';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    scheduledPostEnabled: boolean;
}

const enhanced = withObservables(['scheduledPostEnabled'], ({scheduledPostEnabled, database}: Props) => {
    const scheduledPostTutorialWatched = observeTutorialWatched(Tutorial.SCHEDULED_POST);
    const isLicense = observeLicense(database);

    const scheduledPostFeatureTooltipWatched = combineLatest([scheduledPostTutorialWatched, isLicense]).pipe(
        switchMap(([watched, license]) => {
            if (license?.IsLicensed === 'true' && scheduledPostEnabled) {
                return of$(watched);
            }
            return of$(true);
        }),
        distinctUntilChanged(),
    );
    return {
        scheduledPostFeatureTooltipWatched,
    };
});

export default withDatabase(enhanced(SendButton));
