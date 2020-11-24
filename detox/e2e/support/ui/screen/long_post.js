// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class LongPostScreen {
    testID = {
        longPostScreenPrefix: 'long_post.',
    }

    getPost = (postId, text) => {
        const {postItem, postItemHeaderReply} = Post.getPost(this.testID.longPostScreenPrefix, postId, text);
        return {
            longPostItem: postItem,
            longPostItemHeaderReply: postItemHeaderReply,
        };
    }
}

const longPostScreen = new LongPostScreen();
export default longPostScreen;
