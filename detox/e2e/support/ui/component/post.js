// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Post {
    testID = {
        postHeaderReply: 'post_header.reply',
        markdownText: 'markdown_text',
    }

    getPost = (postItemSourceTestID, postId, postMessage) => {
        const postTestID = `${postItemSourceTestID}.${postId}`;
        const baseMatcher = by.id(postTestID);
        const postItemMatcher = postMessage ? baseMatcher.withDescendant(by.text(postMessage)) : baseMatcher;
        const postItemHeaderReplyMatcher = by.id(this.testID.postHeaderReply).withAncestor(postItemMatcher);
        const postItemMessageMatcher = by.id(this.testID.markdownText).withAncestor(postItemMatcher);

        return {
            postItem: element(postItemMatcher),
            postItemHeaderReply: element(postItemHeaderReplyMatcher),
            postItemMessage: element(postItemMessageMatcher),
        };
    }

    getPostMessage = (postItemSourceTestID) => {
        return element(by.id(this.testID.markdownText).withAncestor(by.id(postItemSourceTestID)));
    }
}

const post = new Post();
export default post;
