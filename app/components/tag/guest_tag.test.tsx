// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Tag from './base_tag';
import GuestTag from './guest_tag';

jest.mock('./base_tag', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Tag).mockImplementation((props) => React.createElement('Tag', {...props}));

describe('GuestTag', () => {
    it('should render with the correct props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <GuestTag
                testID='guest-tag'
                size='m'
            />,
        );

        const tag = getByTestId('guest-tag');
        expect(tag.props.message.id).toBe('post_info.guest');
        expect(tag.props.message.defaultMessage).toBe('Guest');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBe('m');
    });

    it('should render with default props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <GuestTag
                testID='guest-tag'
            />,
        );

        const tag = getByTestId('guest-tag');
        expect(tag.props.message.id).toBe('post_info.guest');
        expect(tag.props.message.defaultMessage).toBe('Guest');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBeUndefined();
    });
});
