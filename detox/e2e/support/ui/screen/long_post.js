// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class LongPostScreen {
    testID = {
        longPostItem: 'long_post.post',
    }

    getPost = (postId, postMessage, postProfileOptions = {}) => {
        const {
            postItem,
            postItemHeaderDateTime,
            postItemHeaderDisplayName,
            postItemHeaderReply,
            postItemMessage,
            postItemProfilePicture,
            postItemProfilePictureUserStatus,
        } = Post.getPost(this.testID.longPostItem, postId, postMessage, postProfileOptions);

        return {
            longPostItem: postItem,
            longPostItemHeaderDateTime: postItemHeaderDateTime,
            longPostItemHeaderDisplayName: postItemHeaderDisplayName,
            longPostItemHeaderReply: postItemHeaderReply,
            longPostItemMessage: postItemMessage,
            longPostItemProfilePicture: postItemProfilePicture,
            longPostItemProfilePictureUserStatus: postItemProfilePictureUserStatus,
        };
    }

    getPostMessage = () => {
        return Post.getPostMessage(this.testID.longPostItem);
    }
}

const longPostScreen = new LongPostScreen();
export default longPostScreen;
