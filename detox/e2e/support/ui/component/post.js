// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Post {
    testID = {
        postHeaderGuestTag: 'post_header.guest_tag',
        postHeaderReply: 'post_header.reply',
        postPreHeaderText: 'post_pre_header.text',
        markdownText: 'markdown_text',
    }

    getPost = (postItemSourceTestID, postId, postMessage) => {
        const postTestID = `${postItemSourceTestID}.${postId}`;
        const baseMatcher = by.id(postTestID);
        const postItemMatcher = postMessage ? baseMatcher.withDescendant(by.text(postMessage)) : baseMatcher;
        const postItemHeaderGuestTagMatcher = by.id(this.testID.postHeaderGuestTag).withAncestor(postItemMatcher);
        const postItemHeaderReplyMatcher = by.id(this.testID.postHeaderReply).withAncestor(postItemMatcher);
        const postItemPreHeaderTextMatch = by.id(this.testID.postPreHeaderText).withAncestor(postItemMatcher);
        const postItemMessageMatcher = by.id(this.testID.markdownText).withAncestor(postItemMatcher);

        return {
            postItem: element(postItemMatcher),
            postItemHeaderGuestTag: element(postItemHeaderGuestTagMatcher),
            postItemHeaderReply: element(postItemHeaderReplyMatcher),
            postItemPreHeaderText: element(postItemPreHeaderTextMatch),
            postItemMessage: element(postItemMessageMatcher),
        };
    }

    getPostMessage = (postItemSourceTestID) => {
        return element(by.id(this.testID.markdownText).withAncestor(by.id(postItemSourceTestID)));
    }
}

const post = new Post();
export default post;
