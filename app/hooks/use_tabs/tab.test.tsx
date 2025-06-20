// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';

import Tab from './tab';

describe('Tab', () => {
    const baseProps = {
        name: {
            id: 'test.tab',
            defaultMessage: 'Test Tab',
        },
        id: 'test',
        handleTabChange: jest.fn(),
        isSelected: false,
        testID: 'tabs',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const {getByText} = renderWithIntl(
            <Tab
                {...baseProps}
            />,
        );

        expect(getByText('Test Tab')).toBeTruthy();
    });

    it('shows selected state', () => {
        const {getByText} = renderWithIntl(
            <Tab
                {...baseProps}
                isSelected={true}
            />,
        );

        const text = getByText('Test Tab');
        expect(text).toHaveStyle({color: Preferences.THEMES.denim.buttonBg});
    });

    it('shows dot indicator when hasDot is true', () => {
        const {getByTestId} = renderWithIntl(
            <Tab
                {...baseProps}
                requiresUserAttention={true}
            />,
        );

        expect(getByTestId('tabs.test.dot')).toBeTruthy();
    });

    it('does not show dot indicator when hasDot is false', () => {
        const {queryByTestId} = renderWithIntl(
            <Tab
                {...baseProps}
                requiresUserAttention={false}
            />,
        );

        expect(queryByTestId('tabs.test.dot')).toBeNull();
    });

    it('calls handleTabChange when pressed', () => {
        const handleTabChange = jest.fn();
        const {getByTestId} = renderWithIntl(
            <Tab
                {...baseProps}
                handleTabChange={handleTabChange}
            />,
        );

        const button = getByTestId('tabs.test.button');
        fireEvent.press(button);

        expect(handleTabChange).toHaveBeenCalledWith('test');
        expect(handleTabChange).toHaveBeenCalledTimes(1);
    });

    it('should use provided count', () => {
        const {getByTestId} = renderWithIntl(
            <Tab
                {...baseProps}
                count={1}
            />,
        );

        expect(getByTestId('tabs.test.badge')).toBeTruthy();
        expect(getByTestId('tabs.test.badge')).toHaveTextContent('1');
    });

    it('should not show badge when count is 0', () => {
        const {queryByTestId} = renderWithIntl(
            <Tab
                {...baseProps}
                count={0}
            />,
        );

        expect(queryByTestId('tabs.test.badge')).toBeNull();
    });
});
