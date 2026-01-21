// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import PostPriorityPickerScreen, {type PostPriorityPickerProps} from '@screens/post_priority_picker';

function PostPriorityPickerRoute() {
    const props = usePropsFromParams<PostPriorityPickerProps>();

    return <PostPriorityPickerScreen {...props}/>;
}

export default PostPriorityPickerRoute;
