// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {updateDraftFile} from '@actions/local/draft';
import {EditPostProvider} from '@context/edit_post';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UploadItem from '.';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/local/draft', () => ({
    updateDraftFile: jest.fn(),
}));

jest.mock('@managers/draft_upload_manager', () => ({
    prepareUpload: jest.fn(),
    isUploading: jest.fn(() => false),
    registerProgressHandler: jest.fn(() => jest.fn()),
    registerErrorHandler: jest.fn(() => jest.fn()),
    cancel: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'serverUrl',
}));

describe('UploadItem', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    const baseProps: Parameters<typeof UploadItem>[0] = {
        channelId: 'channelId',
        galleryIdentifier: 'galleryIdentifier',
        index: 0,
        file: {
            id: 'fileId',
            name: 'fileName',
            extension: 'extension',
            has_preview_image: false,
            height: 0,
            mime_type: 'mime_type',
            size: 0,
            width: 0,
            bytesRead: 0,
            clientId: 'clientId',
            failed: false,
        } as FileInfo,
        openGallery: jest.fn(),
        rootId: 'rootId' as string,
    };

    it('When file is failed, onclick of retry button, it should call prepareUpload with correct arguments in edit mode', () => {
        const updateFileCallback = jest.fn();
        const failedFile = {
            ...baseProps.file,
            failed: true,
        } as FileInfo;

        const props = {
            ...baseProps,
            file: failedFile,
        };

        const {getByTestId} = renderWithEverything(
            <EditPostProvider
                isEditMode={true}
                updateFileCallback={updateFileCallback}
            >
                <UploadItem {...props}/>
            </EditPostProvider>,
            {database},
        );

        fireEvent.press(getByTestId('retry-button'));

        const expectedResetFile = {...failedFile, failed: false};

        expect(updateFileCallback).toHaveBeenCalledWith(expectedResetFile);
        expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(
            serverUrl,
            expectedResetFile,
            props.channelId,
            props.rootId,
            expectedResetFile.bytesRead,
            true,
            updateFileCallback,
        );
        expect(updateDraftFile).not.toHaveBeenCalled();
    });

    it('When file is failed, onclick of retry button, it should call prepareUpload with correct arguments in draft mode', () => {
        const updateFileCallback = jest.fn();
        const failedFile = {
            ...baseProps.file,
            failed: true,
        } as FileInfo;

        const props = {
            ...baseProps,
            file: failedFile,
        };

        const {getByTestId} = renderWithEverything(
            <EditPostProvider
                isEditMode={false}
                updateFileCallback={updateFileCallback}
            >
                <UploadItem {...props}/>
            </EditPostProvider>,
            {database},
        );

        fireEvent.press(getByTestId('retry-button'));

        const expectedResetFile = {...failedFile, failed: false};

        expect(updateDraftFile).toHaveBeenCalledWith(serverUrl, props.channelId, props.rootId, expectedResetFile);
        expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(serverUrl, expectedResetFile, props.channelId, props.rootId, expectedResetFile.bytesRead);
    });
});
