// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {addFilesToDraft} from '@actions/local/draft';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import NetworkManager from '@managers/network_manager';
import {getDraft} from '@queries/servers/drafts';
import {renderWithEverything, renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import SendHandler from '../send_handler';

import DraftHandler from './draft_handler';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/local/draft', () => ({
    ...jest.requireActual('@actions/local/draft'),
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

    describe('voice notes', () => {
        const serverUrl = 'https://voice-notes.test.com';
        let database: Database;

        beforeEach(async () => {
            // Render the real composer and persist drafts for real; only the upload itself stays mocked.
            const {default: ActualSendHandler} = jest.requireActual('../send_handler');
            jest.mocked(SendHandler).mockImplementation((props: ComponentProps<typeof SendHandler>) => <ActualSendHandler {...props}/>);
            jest.mocked(addFilesToDraft).mockImplementation(jest.requireActual('@actions/local/draft').addFilesToDraft);

            const server = await TestHelper.setupServerDatabase(serverUrl);
            database = server.database;
        });

        afterEach(async () => {
            jest.mocked(SendHandler).mockImplementation(() => null);
            jest.mocked(addFilesToDraft).mockReset();
            await TestHelper.tearDown(serverUrl);
            NetworkManager.invalidateClient(serverUrl);
        });

        it('should save a finished recording to the draft and start uploading it', async () => {
            const {getByTestId, unmount} = renderWithEverything(
                <DraftHandler
                    {...baseProps}
                    testID='post_draft'
                    rootId=''
                />,
                {database, serverUrl},
            );

            await act(async () => {
                fireEvent.press(getByTestId('post_draft.quick_actions.voice_action'));
            });
            await waitFor(() => {
                expect(getByTestId('post_draft.voice_recorder')).toBeVisible();
            });

            // Record for a couple of seconds; anything under a second is discarded.
            enableFakeTimers();
            try {
                await act(async () => {
                    await advanceTimers(2000);
                    fireEvent.press(getByTestId('post_draft.voice_recorder.done'));
                    await advanceTimers(0);
                });
            } finally {
                disableFakeTimers();
            }

            let draftFiles: FileInfo[] = [];
            await waitFor(async () => {
                const draft = await getDraft(database, baseProps.channelId, '');
                draftFiles = draft?.files ?? [];
                expect(draftFiles).toHaveLength(1);
            });
            expect(draftFiles[0]).toEqual(expect.objectContaining({
                name: expect.stringMatching(/^voice-note-\d{8}-\d{6}-\d+m\d{2}s\.m4a$/),
                mime_type: 'audio/mp4',
                extension: 'm4a',
            }));
            expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledTimes(1);
            expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(serverUrl, draftFiles[0], baseProps.channelId, '');

            unmount();
        });
    });
});
