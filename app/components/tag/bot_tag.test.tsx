// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Tag from './base_tag';
import BotTag from './bot_tag';

jest.mock('./base_tag', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Tag).mockImplementation((props) => React.createElement('Tag', {...props}));

describe('BotTag', () => {
    it('should render with the correct props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BotTag
                testID='bot-tag'
                size='m'
            />,
        );

        const tag = getByTestId('bot-tag');
        expect(tag.props.message.id).toBe('post_info.bot');
        expect(tag.props.message.defaultMessage).toBe('Bot');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBe('m');
    });

    it('should render with default props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BotTag
                testID='bot-tag'
            />,
        );

        const tag = getByTestId('bot-tag');
        expect(tag.props.message.id).toBe('post_info.bot');
        expect(tag.props.message.defaultMessage).toBe('Bot');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBeUndefined();
    });
});
