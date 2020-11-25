// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class PostListScreen {
    testID = {
        postListScreenPrefix: 'post_list.',
    }

    getPost = (screenPrefix, postId, text) => {
        const {postItem, postItemHeaderReply} = Post.getPost(`${screenPrefix}${this.testID.postListScreenPrefix}`, postId, text);
        return {
            postListPostItem: postItem,
            postListPostItemHeaderReply: postItemHeaderReply,
        };
    }
}

const postListScreen = new PostListScreen();
export default postListScreen;
