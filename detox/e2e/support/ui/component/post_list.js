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
            postItemEmoji,
            postItemHeaderDateTime,
            postItemHeaderDisplayName,
            postItemHeaderGuestTag,
            postItemHeaderReply,
            postItemImage,
            postItemMessage,
            postItemPreHeaderText,
            postItemProfilePicture,
            postItemProfilePictureUserStatus,
            postItemShowLessButton,
            postItemShowMoreButton,
        } = Post.getPost(this.testID.postListPostItem, postId, postMessage, postProfileOptions);

        return {
            postListPostItem: postItem,
            postListPostItemEmoji: postItemEmoji,
            postListPostItemHeaderDateTime: postItemHeaderDateTime,
            postListPostItemHeaderDisplayName: postItemHeaderDisplayName,
            postListPostItemHeaderGuestTag: postItemHeaderGuestTag,
            postListPostItemHeaderReply: postItemHeaderReply,
            postListPostItemImage: postItemImage,
            postListPostItemMessage: postItemMessage,
            postListPostItemPreHeaderText: postItemPreHeaderText,
            postListPostItemProfilePicture: postItemProfilePicture,
            postListPostItemProfilePictureUserStatus: postItemProfilePictureUserStatus,
            postListPostItemShowLessButton: postItemShowLessButton,
            postListPostItemShowMoreButton: postItemShowMoreButton,
        };
    }

    getPostMessageAtIndex = (index) => {
        return Post.getPostMessage(this.testID.postListPostItem).atIndex(index);
    }
}

export default PostList;
