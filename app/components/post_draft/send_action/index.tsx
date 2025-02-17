// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';

import {SendButton} from './send_action';

const enhanced = withObservables([], () => {
    const scheduledPostFeatureTooltipWatched = observeTutorialWatched(Tutorial.SCHEDULED_POST);

    return {
        scheduledPostFeatureTooltipWatched,
    };
});

export default withDatabase(enhanced((SendButton)));
