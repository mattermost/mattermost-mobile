// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import SystemMessage from './system_message';

import type PostModel from '@typings/database/models/servers/post';

const withPost = withObservables(['post'], ({post}: {post: PostModel}) => ({
    author: post.author.observe(),
}));

export default withPost(SystemMessage);
