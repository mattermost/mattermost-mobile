// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import RedactedFilesPlaceholder from './index';

describe('components/post_list/post/body/redacted_files_placeholder', () => {
    it('should render the container', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <RedactedFilesPlaceholder/>,
        );
        expect(getByTestId('redacted-files-placeholder')).toBeTruthy();
    });

    it('should render the title with correct text', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <RedactedFilesPlaceholder/>,
        );
        expect(getByTestId('redacted-files-placeholder.title')).toBeTruthy();
        expect(getByText('Files not available')).toBeTruthy();
    });

    it('should render the subtitle with correct text', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <RedactedFilesPlaceholder/>,
        );
        expect(getByTestId('redacted-files-placeholder.subtitle')).toBeTruthy();
        expect(getByText('Access to files is restricted based on attributes')).toBeTruthy();
    });

    it('should render the file icon', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <RedactedFilesPlaceholder/>,
        );
        expect(getByTestId('redacted-files-placeholder.icon')).toBeTruthy();
    });
});
