// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class SearchResultPostScreen {
    testID = {
        searchResultPostItem: 'search_result_post.post',
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
        } = Post.getPost(this.testID.searchResultPostItem, postId, postMessage, postProfileOptions);

        return {
            searchResultPostItem: postItem,
            searchResultPostItemHeaderDateTime: postItemHeaderDateTime,
            searchResultPostItemHeaderDisplayName: postItemHeaderDisplayName,
            searchResultPostItemHeaderReply: postItemHeaderReply,
            searchResultPostItemMessage: postItemMessage,
            searchResultPostItemProfilePicture: postItemProfilePicture,
            searchResultPostItemProfilePictureUserStatus: postItemProfilePictureUserStatus,
        };
    }

    getPostMessageAtIndex = (index) => {
        return Post.getPostMessage(this.testID.searchResultPostItem).atIndex(index);
    }
}

const searchResultPostScreen = new SearchResultPostScreen();
export default searchResultPostScreen;
