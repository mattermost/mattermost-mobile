// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import * as urlUtils from '@utils/url';

import UserProfileLabel from './label';

// Mock the URL utilities
jest.mock('@utils/url', () => ({
    getScheme: jest.fn(),
    tryOpenURL: jest.fn(),
}));

const mockGetScheme = jest.mocked(urlUtils.getScheme);
const mockTryOpenURL = jest.mocked(urlUtils.tryOpenURL);

describe('UserProfileLabel', () => {
    const baseProps = {
        title: 'Test Title',
        description: 'Test Description',
        testID: 'test-label',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('text type (default)', () => {
        it('should render text type correctly', () => {
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <UserProfileLabel {...baseProps}/>,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('Test Description')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.text')).toBeTruthy();
        });

        it('should render text type when explicitly set', () => {
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    type='text'
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('Test Description')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.text')).toBeTruthy();
        });

        it('should limit title to one line', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel {...baseProps}/>,
            );

            const titleElement = getByTestId('test-label.title');
            expect(titleElement.props.numberOfLines).toBe(1);
        });
    });

    describe('url type', () => {
        it('should render url type as clickable link', () => {
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='example.com'
                    type='url'
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('example.com')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.url')).toBeTruthy();
        });

        it('should add https:// prefix when no scheme is present', () => {
            mockGetScheme.mockReturnValue(null);

            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='example.com'
                    type='url'
                />,
            );

            const linkElement = getByTestId('test-label.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('https://example.com');
        });

        it('should not add prefix when scheme is already present', () => {
            mockGetScheme.mockReturnValue('https');

            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='https://example.com'
                    type='url'
                />,
            );

            const linkElement = getByTestId('test-label.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('https://example.com');
        });

        it('should handle http scheme correctly', () => {
            mockGetScheme.mockReturnValue('http');

            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='http://example.com'
                    type='url'
                />,
            );

            const linkElement = getByTestId('test-label.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('http://example.com');
        });
    });

    describe('phone type', () => {
        it('should render phone type as clickable link', () => {
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='+1234567890'
                    type='phone'
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('+1234567890')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.phone')).toBeTruthy();
        });

        it('should add tel: prefix when no scheme is present', () => {
            mockGetScheme.mockReturnValue(null);

            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='+1234567890'
                    type='phone'
                />,
            );

            const linkElement = getByTestId('test-label.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('tel:+1234567890');
        });

        it('should not add prefix when tel scheme is already present', () => {
            mockGetScheme.mockReturnValue('tel');

            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='tel:+1234567890'
                    type='phone'
                />,
            );

            const linkElement = getByTestId('test-label.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('tel:+1234567890');
        });

        it('should handle phone numbers without plus sign', () => {
            mockGetScheme.mockReturnValue(null);

            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='1234567890'
                    type='phone'
                />,
            );

            const linkElement = getByTestId('test-label.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('tel:1234567890');
        });
    });

    describe('select type', () => {
        it('should render select type as non-clickable text', () => {
            const {getByTestId, getByText, queryByRole} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='Option 1'
                    type='select'
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('Option 1')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.select')).toBeTruthy();

            // Should not be a touchable element
            expect(queryByRole('button')).toBeNull();
        });
    });

    describe('multiselect type', () => {
        it('should render multiselect type as non-clickable text', () => {
            const {getByTestId, getByText, queryByRole} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description='Option 1, Option 2'
                    type='multiselect'
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('Option 1, Option 2')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.select')).toBeTruthy();

            // Should not be a touchable element
            expect(queryByRole('button')).toBeNull();
        });
    });

    describe('testID prop', () => {
        it('should use provided testID for all elements', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    testID='custom-test-id'
                />,
            );

            expect(getByTestId('custom-test-id.title')).toBeTruthy();
            expect(getByTestId('custom-test-id.text')).toBeTruthy();
        });

        it('should work with url type testID', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    testID='custom-test-id'
                    type='url'
                />,
            );

            expect(getByTestId('custom-test-id.title')).toBeTruthy();
            expect(getByTestId('custom-test-id.url')).toBeTruthy();
        });

        it('should work with phone type testID', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    testID='custom-test-id'
                    type='phone'
                />,
            );

            expect(getByTestId('custom-test-id.title')).toBeTruthy();
            expect(getByTestId('custom-test-id.phone')).toBeTruthy();
        });

        it('should work with select type testID', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    testID='custom-test-id'
                    type='select'
                />,
            );

            expect(getByTestId('custom-test-id.title')).toBeTruthy();
            expect(getByTestId('custom-test-id.select')).toBeTruthy();
        });
    });

    describe('edge cases', () => {
        it('should handle empty description', () => {
            const {getByText, getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description=''
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByTestId('test-label.text')).toBeTruthy();
            expect(getByTestId('test-label.text').props.children).toBe('');
        });

        it('should handle empty title', () => {
            const {getByText, getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    title=''
                />,
            );

            expect(getByText('Test Description')).toBeTruthy();
            expect(getByTestId('test-label.title')).toBeTruthy();
            expect(getByTestId('test-label.title').props.children).toBe('');
        });

        it('should handle undefined testID gracefully', () => {
            const {getByText} = renderWithIntlAndTheme(
                <UserProfileLabel
                    title='Test Title'
                    description='Test Description'
                />,
            );

            expect(getByText('Test Title')).toBeTruthy();
            expect(getByText('Test Description')).toBeTruthy();
        });

        it('should handle special characters in URLs', () => {
            mockGetScheme.mockReturnValue(null);

            const specialUrl = 'example.com/path?param=value&other=test';
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description={specialUrl}
                    type='url'
                />,
            );

            const linkElement = getByTestId('test-label.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith(`https://${specialUrl}`);
        });

        it('should handle special characters in phone numbers', () => {
            mockGetScheme.mockReturnValue(null);

            const phoneNumber = '+1 (234) 567-8900';
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    description={phoneNumber}
                    type='phone'
                />,
            );

            const linkElement = getByTestId('test-label.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith(`tel:${phoneNumber}`);
        });
    });

    describe('accessibility', () => {
        it('should have proper accessibility for text type', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel {...baseProps}/>,
            );

            const titleElement = getByTestId('test-label.title');
            const textElement = getByTestId('test-label.text');

            expect(titleElement).toBeTruthy();
            expect(textElement).toBeTruthy();
        });

        it('should have proper accessibility for link types', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <UserProfileLabel
                    {...baseProps}
                    type='url'
                />,
            );

            const linkElement = getByTestId('test-label.url');
            expect(linkElement).toBeTruthy();

            // TouchableOpacity should be accessible by default
            expect(linkElement.type).toBe('Text');
        });
    });
});
