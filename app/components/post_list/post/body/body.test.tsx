// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Files from '@components/files';
import {Screens} from '@constants';
import Preferences from '@constants/preferences';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Body from './body';
import Message from './message';
import UnverifiedFilesPlaceholder from './unverified_files_placeholder';

jest.mock('./message', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Message).mockImplementation(() =>
    React.createElement(View, {testID: 'message'}, null),
);

jest.mock('@components/files', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('./unverified_files_placeholder', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Files).mockImplementation(() =>
    React.createElement(View, {testID: 'files'}, null),
);
jest.mocked(UnverifiedFilesPlaceholder).mockImplementation(() =>
    React.createElement(View, {testID: 'unverified-files-placeholder'}, null),
);

describe('Body attachment render state', () => {
    const theme = Preferences.THEMES.denim;

    type Options = {
        filesInfo?: FileInfo[];
        isRedactionVerified?: boolean;
        isPendingOrFailed?: boolean;
    };

    const renderBody = (metadata: PostMetadata, options: Options = {}) => {
        const {filesInfo = [], isRedactionVerified = true, isPendingOrFailed = false} = options;
        const post = TestHelper.fakePostModel({
            id: 'post-id',
            message: 'a message',
            metadata,
        });

        return renderWithIntlAndTheme(
            <Body
                appsEnabled={false}
                mmBlocksEnabled={false}
                filesInfo={filesInfo}
                hasReactions={false}
                highlight={false}
                highlightReplyBar={false}
                isEphemeral={false}
                isJumboEmoji={false}
                isPendingOrFailed={isPendingOrFailed}
                isPostAddChannelMember={false}
                isRedactionVerified={isRedactionVerified}
                redactionRequiredEpoch={3}
                location={Screens.CHANNEL}
                post={post}
                theme={theme}
                isChannelAutotranslated={false}
            />,
        );
    };

    const aFile = [{id: 'fileid', name: 'a.png', extension: 'png'} as FileInfo];

    it('should render the placeholder when the post has redacted files', () => {
        const {getByTestId} = renderBody({redacted_file_count: 2} as PostMetadata);

        expect(getByTestId('redacted-files-placeholder')).toBeTruthy();
    });

    it('should not render the placeholder when no files are redacted', () => {
        const {queryByTestId} = renderBody({redacted_file_count: 0} as PostMetadata);

        expect(queryByTestId('redacted-files-placeholder')).toBeNull();
    });

    it('should render neither the files nor the restricted placeholder while the decision is stale', () => {
        // The central safety property. Cached file records are not evidence the user may still see
        // them, and a stale redacted count is not evidence they may not.
        const {queryByTestId, getByTestId} = renderBody(
            {redacted_file_count: 0} as PostMetadata,
            {filesInfo: aFile, isRedactionVerified: false},
        );

        expect(queryByTestId('files')).toBeNull();
        expect(queryByTestId('redacted-files-placeholder')).toBeNull();
        expect(getByTestId('unverified-files-placeholder')).toBeTruthy();
    });

    it('should hide a stale denial rather than assert it', () => {
        const {queryByTestId, getByTestId} = renderBody(
            {redacted_file_count: 2} as PostMetadata,
            {isRedactionVerified: false},
        );

        expect(queryByTestId('redacted-files-placeholder')).toBeNull();
        expect(getByTestId('unverified-files-placeholder')).toBeTruthy();
    });

    it('should render exactly one of files or the restricted placeholder once verified', () => {
        const allowed = renderBody({redacted_file_count: 0} as PostMetadata, {filesInfo: aFile});
        expect(allowed.getByTestId('files')).toBeTruthy();
        expect(allowed.queryByTestId('redacted-files-placeholder')).toBeNull();
        expect(allowed.queryByTestId('unverified-files-placeholder')).toBeNull();

        // The server clears metadata.files whenever it sets a redacted count, so these two are
        // mutually exclusive in practice; stored files are passed anyway so this asserts the client
        // enforces it rather than assuming it.
        const denied = renderBody({redacted_file_count: 2} as PostMetadata, {filesInfo: aFile});
        expect(denied.queryByTestId('files')).toBeNull();
        expect(denied.getByTestId('redacted-files-placeholder')).toBeTruthy();
        expect(denied.queryByTestId('unverified-files-placeholder')).toBeNull();
    });

    it('should not gate a pending local post that has never reached the server', () => {
        const {getByTestId, queryByTestId} = renderBody(
            {} as PostMetadata,
            {filesInfo: aFile, isRedactionVerified: false, isPendingOrFailed: true},
        );

        expect(getByTestId('files')).toBeTruthy();
        expect(queryByTestId('unverified-files-placeholder')).toBeNull();
    });

    it('should not show any attachment state for a text-only post', () => {
        const {queryByTestId} = renderBody({} as PostMetadata, {isRedactionVerified: false});

        expect(queryByTestId('unverified-files-placeholder')).toBeNull();
        expect(queryByTestId('files')).toBeNull();
    });
});
