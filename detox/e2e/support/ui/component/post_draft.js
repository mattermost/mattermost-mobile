// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class PostDraft {
    testID = {
        postDraft: 'post_draft',
        postDraftArchived: 'post_draft.archived',
        postDraftReadOnly: 'post_draft.archived',
        postInput: 'post_draft.post.input',
    }

    postDraft = element(by.id(this.testID.postDraft));
    postDraftArchived = element(by.id(this.testID.postDraftArchived));
    postDraftReadOnly = element(by.id(this.testID.postDraftReadOnly));
    postInput = element(by.id(this.testID.postInput));

    toBeVisible = async (options = {archived: false, readOnly: false}) => {
        if (options.archived) {
            await expect(this.postDraftArchived).toBeVisible();
            return this.postDraftArchived;
        }

        if (options.readOnly) {
            await expect(this.postDraftReadOnly).toBeVisible();
            return this.postDraftReadOnly;
        }

        await expect(this.postDraft).toBeVisible();
        return this.postDraft;
    }
}

const postDraft = new PostDraft();
export default postDraft;
