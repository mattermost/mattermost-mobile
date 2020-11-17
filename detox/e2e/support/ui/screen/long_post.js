// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class LongPostScreen {
    testID = {
        longPostScreenPrefix: 'long_post.',
    }

    getPost = (postId, text) => {
        return Post.getPost(this.testID.longPostScreenPrefix, postId, text);
    }
}

const longPostScreen = new LongPostScreen();
export default longPostScreen;
