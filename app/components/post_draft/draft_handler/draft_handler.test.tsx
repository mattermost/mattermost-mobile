// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {addFilesToDraft} from '@actions/local/draft';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {renderWithIntl} from '@test/intl-test-helper';

import SendHandler from '../send_handler';

import DraftHandler from './draft_handler';

jest.mock('@actions/local/draft', () => ({
    addFilesToDraft: jest.fn(),
    removeDraft: jest.fn(),
}));

jest.mock('@hooks/render_permissions', () => ({
    useFetchRenderPermissions: jest.fn(),
}));

jest.mock('@managers/draft_upload_manager', () => ({
    prepareUpload: jest.fn(),
    registerErrorHandler: jest.fn(),
    isUploading: jest.fn(),
}));

jest.mock('../send_handler', () => jest.fn(() => null));

describe('components/post_draft/draft_handler/DraftHandler', () => {
    const baseProps: ComponentProps<typeof DraftHandler> = {
        channelId: 'channel-id',
        cursorPosition: 0,
        maxFileCount: 10,
        maxFileSize: 1000,
        canUploadFiles: true,
        canUploadFilesByPolicy: true,
        updateCursorPosition: jest.fn(),
        updatePostInputTop: jest.fn(),
        updateValue: jest.fn(),
        value: '',
        setIsFocused: jest.fn(),
    };

    const getSendHandlerProps = () => jest.mocked(SendHandler).mock.calls.at(-1)?.[0] as ComponentProps<typeof SendHandler>;

    it('should reject pasted files with the policy message when a permission policy denies uploads in the channel', () => {
        renderWithIntl(
            <DraftHandler
                {...baseProps}
                canUploadFilesByPolicy={false}
            />,
        );

        act(() => {
            getSendHandlerProps().addFiles([{clientId: 'client-id', name: 'file.png', size: 10} as FileInfo]);
        });

        expect(getSendHandlerProps().uploadFileError).toBe('File uploads are restricted in this channel');
        expect(addFilesToDraft).not.toHaveBeenCalled();
        expect(DraftEditPostUploadManager.prepareUpload).not.toHaveBeenCalled();
    });
});
