// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import ScheduledPostOptionsScreen, {type ScheduledPostOptionsProps} from '@screens/scheduled_post_options';

export default function ScheduledPostOptionsRoute() {
    const props = usePropsFromParams<ScheduledPostOptionsProps>();

    return <ScheduledPostOptionsScreen {...props}/>;
}
