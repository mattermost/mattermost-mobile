// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import ThreadOptionsScreen, {type ThreadOptionsProps} from '@screens/thread_options';

export default function ThreadOptionsRoute() {
    const props = usePropsFromParams<ThreadOptionsProps>();

    return <ThreadOptionsScreen {...props}/>;
}
