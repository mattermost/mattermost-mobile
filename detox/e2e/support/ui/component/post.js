// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Post {
    testID = {
        postPrefix: 'post.',
        postHeaderReply: 'post_header.reply',
    }

    getPost = (postTypePrefix, postId, text) => {
        const postTestID = `${postTypePrefix}${this.testID.postPrefix}${postId}`;
        if (text) {
            return {
                postItem: element(by.id(postTestID).withDescendant(by.text(text))),
                postItemHeaderReply: element(by.id(this.testID.postHeaderReply).withAncestor(by.id(postTestID).withDescendant(by.text(text)))),
            };
        }
        return {
            postItem: element(by.id(postTestID)),
            postItemHeaderReply: element(by.id(this.testID.postHeaderReply).withAncestor(by.id(postTestID))),
        };
    }
}

const post = new Post();
export default post;
