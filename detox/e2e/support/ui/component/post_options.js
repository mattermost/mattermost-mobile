// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class PostOptions {
    testID = {
        postOptions: 'post.options',
        openReactionPicker: 'open.reaction_picker',
    }

    openReactionPicker = element(by.id(this.testID.openReactionPicker));

    toBeVisible = async () => {
        await expect(element(by.id(this.testID.postOptions))).toBeVisible();
    }
}

const postOptions = new PostOptions();
export default postOptions;
