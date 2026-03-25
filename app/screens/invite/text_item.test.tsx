// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import TextItem from './text_item';
import {TextItemType} from './types';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('TextItem', () => {
    it('renders search invite type correctly', () => {
        const {getByText} = renderWithIntl(
            <TextItem
                text='test@example.com'
                type={TextItemType.SEARCH_INVITE}
                testID='invite.text_item'
            />,
        );

        expect(getByText('invite')).toBeTruthy();
        expect(getByText('test@example.com')).toBeTruthy();
    });

    it('renders search no results type correctly', () => {
        const {getByText} = renderWithIntl(
            <TextItem
                text='test@example.com'
                type={TextItemType.SEARCH_NO_RESULTS}
                testID='invite.text_item'
            />,
        );

        expect(getByText('No one found matching')).toBeTruthy();
        expect(getByText('test@example.com')).toBeTruthy();
    });

    it('renders summary type correctly', () => {
        const {getByText} = renderWithIntl(
            <TextItem
                text='test@example.com'
                type={TextItemType.SUMMARY}
                testID='invite.text_item'
            />,
        );

        expect(getByText('test@example.com')).toBeTruthy();
    });
});

