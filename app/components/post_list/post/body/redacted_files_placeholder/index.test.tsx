// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import RedactedFilesPlaceholder from './index';

describe('components/post_list/post/body/redacted_files_placeholder', () => {
    it('should render the icon, title and subtitle', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <RedactedFilesPlaceholder/>,
        );

        expect(getByTestId('redacted-files-placeholder.icon')).toBeTruthy();
        expect(getByText('Files not available')).toBeTruthy();
        expect(getByText('Access to files is restricted based on attributes')).toBeTruthy();
    });
});
