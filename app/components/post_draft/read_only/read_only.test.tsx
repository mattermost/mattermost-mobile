// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ReadOnly from './index';

describe('ReadOnly', () => {
    it('should explain that the channel is read-only by default', () => {
        const {getByText, queryByText} = renderWithIntlAndTheme(<ReadOnly/>);

        expect(getByText('This channel is read-only.')).toBeTruthy();
        expect(queryByText('You do not have permission to post in this channel.')).toBeNull();
    });

    it('should explain the write denial when the policy refused', () => {
        const {getByText, queryByText} = renderWithIntlAndTheme(<ReadOnly writeDenied={true}/>);

        expect(getByText('You do not have permission to post in this channel.')).toBeTruthy();
        expect(queryByText('This channel is read-only.')).toBeNull();
    });
});
