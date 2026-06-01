// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import PostModel from '@typings/database/models/servers/post';

import Body from './body';

const enhanced = withObservables(['post'], ({post}: {post: PostModel}) => ({
    post: post.observe(),
}));

export default React.memo(enhanced(Body));
