// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import DraftScheduledPostScreen, {type DraftScheduledPostProps} from '@screens/draft_scheduled_post_options';

export default function DraftScheduledPostOptionsRoute() {
    const props = usePropsFromParams<DraftScheduledPostProps>();

    return <DraftScheduledPostScreen {...props}/>;
}
