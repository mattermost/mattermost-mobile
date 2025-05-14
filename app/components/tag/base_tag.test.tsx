// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Tag from './base_tag';

describe('Tag', () => {
    const defaultProps = {
        message: 'Test Tag',
    };

    it('should render correctly', () => {
        const {getByText} = renderWithIntlAndTheme(<Tag {...defaultProps}/>);
        expect(getByText('Test Tag')).toBeDefined();
    });

    it('should render icon correctly', () => {
        const {getByTestId, rerender, queryByTestId} = renderWithIntlAndTheme(
            <Tag
                {...defaultProps}
                icon='check'
                testID='test-tag'
            />,
        );
        expect(getByTestId('test-tag.icon')).toBeDefined();

        rerender(
            <Tag
                {...defaultProps}
                testID='test-tag'
            />,
        );
        expect(queryByTestId('test-tag.icon')).not.toBeDefined();
    });

    it('should render uppercase correctly', () => {
        const {getByText, queryByText} = renderWithIntlAndTheme(
            <Tag
                {...defaultProps}
                uppercase={true}
            />,
        );
        expect(getByText('TEST TAG')).toBeDefined();
        expect(queryByText('Test Tag')).not.toBeDefined();
    });
});
