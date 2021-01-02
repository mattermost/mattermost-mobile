// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class LongPostScreen {
    testID = {
        longPostItem: 'long_post.post',
    }

    getPost = (postId, postMessage) => {
        const {postItem, postItemHeaderReply, postItemMessage} = Post.getPost(this.testID.longPostItem, postId, postMessage);
        return {
            longPostItem: postItem,
            longPostItemHeaderReply: postItemHeaderReply,
            longPostItemMessage: postItemMessage,
        };
    }

    getPostMessage = () => {
        return Post.getPostMessage(this.testID.longPostItem);
    }
}

const longPostScreen = new LongPostScreen();
export default longPostScreen;
