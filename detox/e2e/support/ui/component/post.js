// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Post {
    testID = {
        postPrefix: 'post.',
    }

    getPost = (postTypePrefix, postId, text) => {
        if (text) {
            return element(by.id(`${postTypePrefix}${this.testID.postPrefix}${postId}`).withDescendant(by.text(text)));
        }
        return element(by.id(`${postTypePrefix}${this.testID.postPrefix}${postId}`));
    }
}

const post = new Post();
export default post;
