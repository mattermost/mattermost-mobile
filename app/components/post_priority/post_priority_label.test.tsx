// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Tag from '@components/tag';
import {PostPriorityType} from '@constants/post';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import PostPriorityLabel from './post_priority_label';

jest.mock('@components/tag', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Tag).mockImplementation((props) => React.createElement('Tag', {...props}));

describe('PostPriorityLabel', () => {
    it('should return null for standard priority', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <PostPriorityLabel label={PostPriorityType.STANDARD}/>);
        expect(toJSON()).toBeNull();
    });

    it('should render urgent priority label correctly', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <PostPriorityLabel label={PostPriorityType.URGENT}/>);

        const tag = getByTestId('urgent_post_priority_label');
        expect(tag.props.message.id).toBe('post_priority.label.urgent');
        expect(tag.props.icon).toBe('alert-outline');
        expect(tag.props.type).toBe('danger');
        expect(tag.props.size).toBe('xs');
        expect(tag.props.uppercase).toBe(true);
    });

    it('should render important priority label correctly', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <PostPriorityLabel label={PostPriorityType.IMPORTANT}/>);

        const tag = getByTestId('important_post_priority_label');
        expect(tag.props.message.id).toBe('post_priority.label.important');
        expect(tag.props.icon).toBe('alert-circle-outline');
        expect(tag.props.type).toBe('info');
        expect(tag.props.size).toBe('xs');
        expect(tag.props.uppercase).toBe(true);
    });
});
