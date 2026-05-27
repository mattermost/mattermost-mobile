// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import ReactionsScreen, {type ReactionsProps} from '@screens/reactions';

export default function ReactionsRoute() {
    const props = usePropsFromParams<ReactionsProps>();

    return <ReactionsScreen {...props}/>;
}
