// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class PostDraft {
    testID = {
        postDraftSuffix: 'post_draft',
        postDraftArchivedSuffix: 'post_draft.archived',
        postDraftReadOnlySuffix: 'post_draft.read_only',
        postInputSuffix: 'post_draft.post.input',
    };

    getPostDraft = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.postDraftSuffix}`));
    };

    getPostDraftArchived = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.postDraftArchivedSuffix}`));
    };

    getPostDraftArchivedCloseChannelButton = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.postDraftArchivedSuffix}.close_channel.button`));
    };

    getPostDraftReadOnly = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.postDraftReadOnlySuffix}`));
    };

    getPostInput = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.postInputSuffix}`));
    };
}

const postDraft = new PostDraft();
export default postDraft;
