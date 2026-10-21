// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
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

// Loaded once with the test file: requiring the whole composer inside a hook or test counts
// towards its timeout and can take tens of seconds on a busy machine.
const {default: ActualSendHandler} = jest.requireActual<{default: typeof SendHandler}>('../send_handler');
const {addFilesToDraft: actualAddFilesToDraft} = jest.requireActual<typeof import('@actions/local/draft')>('@actions/local/draft');

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

    it('should tell the composer whether the files were accepted, so a rejected recording can be deleted', () => {
        renderWithIntl(<DraftHandler {...baseProps}/>);

        let accepted: boolean | undefined;
        act(() => {
            accepted = getSendHandlerProps().addFiles([{clientId: 'client-id', name: 'file.png', size: 10} as FileInfo]);
        });
        expect(accepted).toBe(true);
        expect(addFilesToDraft).toHaveBeenCalledTimes(1);

        let rejected: boolean | undefined;
        act(() => {
            rejected = getSendHandlerProps().addFiles([{clientId: 'large-client-id', name: 'large.png', size: 2000} as FileInfo]);
        });
        expect(rejected).toBe(false);
        expect(getSendHandlerProps().uploadFileError).toBe('Files must be less than 1000 B');
        expect(addFilesToDraft).toHaveBeenCalledTimes(1);
    });

    describe('voice notes', () => {
        const serverUrl = 'https://voice-notes.test.com';
        let database: Database;

        beforeEach(async () => {
            // Render the real composer and persist drafts for real; only the upload itself stays mocked.
            jest.mocked(SendHandler).mockImplementation((props: ComponentProps<typeof SendHandler>) => <ActualSendHandler {...props}/>);
            jest.mocked(addFilesToDraft).mockImplementation(actualAddFilesToDraft);

            const server = await TestHelper.setupServerDatabase(serverUrl);
            database = server.database;

            // A fixed clock keeps the recording time, and so the file name, exact.
            enableFakeTimers();
            jest.setSystemTime(new Date(2026, 9, 20, 14, 35, 1));
        });

        afterEach(async () => {
            disableFakeTimers();
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
                await advanceTimers(0);
            });
            expect(getByTestId('post_draft.voice_recorder')).toBeVisible();

            // Record for a couple of seconds; anything under a second is discarded.
            await act(async () => {
                await advanceTimers(2000);
                fireEvent.press(getByTestId('post_draft.voice_recorder.done'));
                await advanceTimers(0);
            });

            const draft = await getDraft(database, baseProps.channelId, '');
            const draftFiles = draft?.files ?? [];
            expect(draftFiles).toHaveLength(1);
            expect(draftFiles[0]).toEqual(expect.objectContaining({
                name: 'voice-note-20261020-143501-0m02s.m4a',
                localPath: 'file:///mock/voice-note-20261020-143501-0m02s.m4a',
                mime_type: 'audio/mp4',
                extension: 'm4a',
            }));
            expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledTimes(1);
            expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(serverUrl, draftFiles[0], baseProps.channelId, '');

            unmount();
        });
    });
});
