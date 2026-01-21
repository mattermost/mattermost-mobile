// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import UserProfileScreen, {type UserProfileProps} from '@screens/user_profile';

export default function UserProfileRoute() {
    const props = usePropsFromParams<UserProfileProps>();

    return <UserProfileScreen {...props}/>;
}
