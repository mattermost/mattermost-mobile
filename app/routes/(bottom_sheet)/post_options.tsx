// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import PostOptionsScreen, {type PostOptionsProps} from '@screens/post_options';

export default function PostOptionsRoute() {
    const props = usePropsFromParams<PostOptionsProps>();

    return <PostOptionsScreen {...props}/>;
}
