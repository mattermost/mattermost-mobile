// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import AgentTag from './agent_tag';
import Tag from './base_tag';

jest.mock('./base_tag', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Tag).mockImplementation((props) => React.createElement('Tag', {...props}));

describe('AgentTag', () => {
    it('should render with the correct props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AgentTag
                testID='agent-tag'
                size='m'
            />,
        );

        const tag = getByTestId('agent-tag');
        expect(tag.props.message.id).toBe('post_info.agent');
        expect(tag.props.message.defaultMessage).toBe('Agent');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBe('m');
    });

    it('should render with default props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AgentTag
                testID='agent-tag'
            />,
        );

        const tag = getByTestId('agent-tag');
        expect(tag.props.message.id).toBe('post_info.agent');
        expect(tag.props.message.defaultMessage).toBe('Agent');
        expect(tag.props.uppercase).toBe(true);
        expect(tag.props.size).toBeUndefined();
    });
});
