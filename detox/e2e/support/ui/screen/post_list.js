// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class PostListScreen {
    testID = {
        postListScreenPrefix: 'post_list.',
    }

    getPost = (postId, text) => {
        return Post.getPost(this.testID.postListScreenPrefix, postId, text);
    }
}

const postListScreen = new PostListScreen();
export default postListScreen;
