// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Post from './post';

class PostList {
    constructor(screenPrefix) {
        this.testID = {
            postListPostItem: `${screenPrefix}post_list.post`,
        };
    }

    getPost = (postId, postMessage, postProfileOptions = {}) => {
        const {
            postItem,
            postItemHeaderDateTime,
            postItemHeaderDisplayName,
            postItemHeaderReply,
            postItemMessage,
            postItemPreHeaderText,
            postItemProfilePicture,
            postItemProfilePictureUserStatus,
        } = Post.getPost(this.testID.postListPostItem, postId, postMessage, postProfileOptions);

        return {
            postListPostItem: postItem,
            postListPostItemHeaderDateTime: postItemHeaderDateTime,
            postListPostItemHeaderDisplayName: postItemHeaderDisplayName,
            postListPostItemHeaderReply: postItemHeaderReply,
            postListPostItemMessage: postItemMessage,
            postListPostItemPreHeaderText: postItemPreHeaderText,
            postListPostItemProfilePicture: postItemProfilePicture,
            postListPostItemProfilePictureUserStatus: postItemProfilePictureUserStatus,
        };
    }

    getPostMessageAtIndex = (index) => {
        return Post.getPostMessage(this.testID.postListPostItem).atIndex(index);
    }
}

export default PostList;
