// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import fs from 'fs';
import assert from 'assert';

const FormData = require('form-data');

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
        const {basicClient, basicTeam, basicChannel} = TestHelper;
        const testFileName = 'test.png';
        const testImageData = fs.createReadStream(`test/assets/images/${testFileName}`);
        const clientId = TestHelper.generateId();

        const imageFormData = new FormData();
        imageFormData.append('files', testImageData);
        imageFormData.append('channel_id', basicChannel.id);
        imageFormData.append('client_ids', clientId);
        const formBoundary = imageFormData.getBoundary();

        const fileUploadResp = await basicClient.
            uploadFile(basicTeam.id, basicChannel.id, clientId, imageFormData, formBoundary);
        const fileId = fileUploadResp.file_infos[0].id;

        const fakePostForFile = TestHelper.fakePost(basicChannel.id);
        fakePostForFile.file_ids = [fileId];
        const postForFile = await basicClient.createPost(basicTeam.id, fakePostForFile);

        await Actions.getFilesForPost(
            basicTeam.id, basicChannel.id, postForFile.id
        )(store.dispatch, store.getState);

        const filesRequest = store.getState().requests.files.getFilesForPost;
        const {files: allFiles, fileIdsByPostId} = store.getState().entities.files;

        if (filesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(filesRequest.error));
        }

        assert.ok(allFiles);
        assert.ok(allFiles[fileId]);
        assert.equal(allFiles[fileId].id, fileId);
        assert.equal(allFiles[fileId].name, testFileName);

        assert.ok(fileIdsByPostId);
        assert.ok(fileIdsByPostId[postForFile.id]);
        assert.equal(fileIdsByPostId[postForFile.id][0], fileId);
    });
});
