// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import PostPriorityScreen, {type PostPriorityPickerProps} from '@screens/post_priority_picker';

function PostPriorityRoute() {
    const props = usePropsFromParams<PostPriorityPickerProps>();

    return <PostPriorityScreen {...props}/>;
}

export default PostPriorityRoute;
