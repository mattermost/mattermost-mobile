// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removeDraftFile} from '@actions/local/draft';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UploadRemove from './upload_remove';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@context/edit_post', () => ({
    useEditPost: jest.fn(),
}));

jest.mock('@actions/local/draft', () => ({
    removeDraftFile: jest.fn(),
}));

const {useEditPost} = require('@context/edit_post');

describe('UploadRemove', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        database = (await TestHelper.setupServerDatabase(serverUrl)!).database;
    });

    it('should call onFileRemove when isEditMode is true', () => {
        const onFileRemove = jest.fn();
        jest.mocked(useEditPost).mockReturnValue({
            onFileRemove,
            isEditMode: true,
        });

        const {getByTestId} = renderWithEverything(
            <UploadRemove
                channelId='channelId'
                rootId='rootId'
                clientId='clientId'
                fileId='fileId'
            />,
            {database},
        );
        fireEvent.press(getByTestId('remove-button-fileId'));
        expect(onFileRemove).toHaveBeenCalledWith('fileId');
    });

    it('should call removeDraftFile when isEditMode is false', () => {
        jest.mocked(useEditPost).mockReturnValue({
            isEditMode: false,
        });

        const {getByTestId} = renderWithEverything(
            <UploadRemove
                channelId='channelId'
                rootId='rootId'
                clientId='clientId'
                fileId='fileId'
            />,
            {database, serverUrl},
        );
        fireEvent.press(getByTestId('remove-button-fileId'));
        expect(removeDraftFile).toHaveBeenCalledWith(serverUrl, 'channelId', 'rootId', 'clientId');
    });
});
