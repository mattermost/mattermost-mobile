// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class SearchResultPostScreen {
    testID = {
        searchResultPostItem: 'search_result_post.post',
    }

    getPost = (postId, postMessage) => {
        const {postItem, postItemHeaderReply, postItemMessage} = Post.getPost(this.testID.searchResultPostItem, postId, postMessage);
        return {
            searchResultPostItem: postItem,
            searchResultPostItemHeaderReply: postItemHeaderReply,
            searchResultPostItemMessage: postItemMessage,
        };
    }

    getPostMessageAtIndex = (index) => {
        return Post.getPostMessage(this.testID.searchResultPostItem).atIndex(index);
    }
}

const searchResultPostScreen = new SearchResultPostScreen();
export default searchResultPostScreen;
