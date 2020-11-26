// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostList} from '@support/ui/component';
import {LongPostScreen} from '@support/ui/screen';

class PermalinkScreen {
    testID = {
        permalinkScreenPrefix: 'permalink.',
        permalinkScreen: 'permalink.screen',
    }

    permalinkScreen = element(by.id(this.testID.permalinkScreen));

    postList = new PostList(this.testID.permalinkScreenPrefix);

    getLongPostItem = (postId, text) => {
        return LongPostScreen.getPost(postId, text);
    }

    getLongPostMessage = () => {
        return LongPostScreen.getPostMessage();
    }

    getPostListPostItem = (postId, text) => {
        return this.postList.getPost(postId, text);
    }

    getPostMessageAtIndex = (index) => {
        return this.postList.getPostMessageAtIndex(index);
    }

    hasLongPostMessage = async (postMessage) => {
        await expect(
            this.getLongPostMessage(),
        ).toHaveText(postMessage);
    }

    hasPostMessageAtIndex = async (index, postMessage) => {
        await expect(
            this.getPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    }
}

const permalinkScreen = new PermalinkScreen();
export default permalinkScreen;
