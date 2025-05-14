// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import SendButton from '@components/post_draft/send_button/send_button';
import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';

const enhanced = withObservables([], () => {
    const scheduledPostFeatureTooltipWatched = observeTutorialWatched(Tutorial.SCHEDULED_POST);

    return {
        scheduledPostFeatureTooltipWatched,
    };
});

export default withDatabase(enhanced(SendButton));
