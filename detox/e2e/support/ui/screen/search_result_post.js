// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@support/ui/component';

class SearchResultPostScreen {
    testID = {
        searchResultPostScreenPrefix: 'search_result_post.',
    }

    getPost = (postId, text) => {
        return Post.getPost(this.testID.searchResultPostScreenPrefix, postId, text);
    }
}

const searchResultPostScreen = new SearchResultPostScreen();
export default searchResultPostScreen;
