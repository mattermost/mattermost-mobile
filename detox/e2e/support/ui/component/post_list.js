// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Post from './post';

class PostList {
    constructor(screenPrefix) {
        this.testID = {
            postListPostItem: `${screenPrefix}post_list.post`,
        };
    }

    getPost = (postId, postMessage) => {
        const {
            postItem,
            postItemHeaderGuestTag,
            postItemHeaderReply,
            postItemPreHeaderText,
            postItemMessage,
        } = Post.getPost(this.testID.postListPostItem, postId, postMessage);

        return {
            postListPostItem: postItem,
            postListPostItemHeaderGuestTag: postItemHeaderGuestTag,
            postListPostItemHeaderReply: postItemHeaderReply,
            postListPostItemPreHeaderText: postItemPreHeaderText,
            postListPostItemMessage: postItemMessage,
        };
    }

    getPostMessageAtIndex = (index) => {
        return Post.getPostMessage(this.testID.postListPostItem).atIndex(index);
    }
}

export default PostList;
