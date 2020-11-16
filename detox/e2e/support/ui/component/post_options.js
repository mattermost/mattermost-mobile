// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class PostOptions {
    testID = {
        postOptions: 'post.options',
        openReactionPicker: 'open.reaction_picker',
    }

    postOptions = element(by.id(this.testID.postOptions));
    openReactionPicker = element(by.id(this.testID.openReactionPicker));

    toBeVisible = async () => {
        await expect(this.postOptions).toBeVisible();

        return postOptions;
    }
}

const postOptions = new PostOptions();
export default postOptions;
