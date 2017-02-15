// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/files';
import Client from 'service/client';
import configureStore from 'app/store';
import {RequestStatus} from 'service/constants';
import TestHelper from 'test/test_helper';

describe('Actions.Files', () => {
    let store;
    before(async () => {
        await TestHelper.initBasic(Client);
    });

    beforeEach(() => {
        store = configureStore();
    });

    after(async () => {
        await TestHelper.basicClient.logout();
    });

    it('getFilesForPost', async () => {
        const {basicTeam, basicChannel, basicPost} = TestHelper;

        await Actions.getFilesForPost(
            basicTeam.id, basicChannel.id, basicPost.id
        )(store.dispatch, store.getState);

        const filesRequest = store.getState().requests.files.getFilesForPost;
        const {files: allFiles, fileIdsByPostId} = store.getState().entities.files;

        if (filesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(filesRequest.error));
        }

        assert.ok(allFiles);
        assert.ok(fileIdsByPostId[basicPost.id]);
    });
});
