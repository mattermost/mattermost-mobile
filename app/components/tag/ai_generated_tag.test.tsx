// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import AiGeneratedTag from './ai_generated_tag';
import Tag from './base_tag';

jest.mock('./base_tag', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Tag).mockImplementation((props) => React.createElement('Tag', {...props}));

describe('AiGeneratedTag', () => {
    it('should render with the correct props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AiGeneratedTag
                testID='ai-tag'
                size='m'
            />,
        );

        const tag = getByTestId('ai-tag');
        expect(tag.props.message.id).toBe('post_info.ai_generated');
        expect(tag.props.message.defaultMessage).toBe('AI');
        expect(tag.props.icon).toBe('creation-outline');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBe('m');
    });

    it('should render with default props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AiGeneratedTag
                testID='ai-tag'
            />,
        );

        const tag = getByTestId('ai-tag');
        expect(tag.props.message.id).toBe('post_info.ai_generated');
        expect(tag.props.icon).toBe('creation-outline');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBeUndefined();
    });
});
