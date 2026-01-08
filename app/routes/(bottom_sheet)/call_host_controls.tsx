// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import HostControlsScreen from '@calls/screens/host_controls';
import {getCurrentCall} from '@calls/state';
import {usePropsFromParams} from '@hooks/props_from_params';

export default function PostOptionsRoute() {
    const {sessionId} = usePropsFromParams<{sessionId: string}>();
    const currentCall = getCurrentCall();
    const session = currentCall?.sessions[sessionId];

    return <HostControlsScreen session={session!}/>;
}
