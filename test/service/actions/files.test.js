// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import fs from 'fs';
import assert from 'assert';

const FormData = require('form-data');

import * as Actions from 'service/actions/files';
import * as PostActions from 'service/actions/posts';
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
        const {basicClient, basicTeam, basicChannel, basicPost} = TestHelper;

        const testImageData = fs.readFileSync('test/assets/images/test.png');
        const clientId = TestHelper.generateId();

        const imageFormData = new FormData();
        imageFormData.append('files', testImageData);
        imageFormData.append('channel_id', basicChannel.id);
        imageFormData.append('client_ids', clientId);
        const formBoundary = imageFormData.getBoundary();

        const fileUploadResp = await basicClient.
            uploadFile(basicTeam.id, basicChannel.id, clientId, imageFormData, formBoundary);
        const fileId = fileUploadResp.file_infos[0];

        const post = TestHelper.fakePost(basicChannel.id);
        post.file_ids = [fileId];
        await PostActions.createPost(basicTeam.id, post)(store.dispatch, store.getState);
        const postRequest = store.getState().requests.posts.createPost;
        if (postRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(postRequest.error));
        }

        await Actions.getFilesForPost(
            basicTeam.id, basicChannel.id, basicPost.id
        )(store.dispatch, store.getState);

        const filesRequest = store.getState().requests.files.getFilesForPost;
        const {files: allFiles, fileIdsByPostId} = store.getState().entities.files;

        if (filesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(filesRequest.error));
        }

        assert.ok(allFiles);
        assert.ok(allFiles[fileId]);
        assert.equal(allFiles[fileId].id, fileId);

        assert.ok(fileIdsByPostId);
        assert.ok(fileIdsByPostId[basicPost.id]);
        assert.equal(fileIdsByPostId[basicPost.id][0], fileId);
    });
});
