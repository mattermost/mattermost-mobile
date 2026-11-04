// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ReadOnly from './index';

const READ_ONLY_TEXT = 'This channel is read-only.';
const WRITE_DENIED_TEXT = 'You do not have permission to post in this channel.';

describe('components/post_draft/read_only', () => {
    it('should explain that the channel is read-only', () => {
        const {getByText, queryByText} = renderWithIntlAndTheme(<ReadOnly/>);

        expect(getByText(READ_ONLY_TEXT)).toBeTruthy();
        expect(queryByText(WRITE_DENIED_TEXT)).toBeNull();
    });

    it('should explain that posting is denied when a channel policy denies writing', () => {
        const {getByText, queryByText} = renderWithIntlAndTheme(<ReadOnly writeDenied={true}/>);

        expect(getByText(WRITE_DENIED_TEXT)).toBeTruthy();
        expect(queryByText(READ_ONLY_TEXT)).toBeNull();
    });
});
