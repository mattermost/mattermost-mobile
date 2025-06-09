// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import UserProfileLink from './label_link';

// Mock the URL utilities
jest.mock('@utils/url', () => ({
    getScheme: jest.fn(),
    tryOpenURL: jest.fn(),
}));

const mockGetScheme = require('@utils/url').getScheme as jest.Mock;
const mockTryOpenURL = require('@utils/url').tryOpenURL as jest.Mock;

describe('UserProfileLink', () => {
    const baseProps = {
        description: 'example.com',
        linkType: 'url',
        testID: 'test-link',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('url type', () => {
        it('should render URL link correctly', () => {
            renderWithIntlAndTheme(
                <UserProfileLink {...baseProps}/>,
            );

            expect(screen.getByText('example.com')).toBeTruthy();
            expect(screen.getByTestId('test-link.url')).toBeTruthy();
        });

        it('should add https:// prefix when no scheme is present', () => {
            mockGetScheme.mockReturnValue(null);

            renderWithIntlAndTheme(
                <UserProfileLink {...baseProps}/>,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('https://example.com');
        });

        it('should not add prefix when scheme is already present', () => {
            mockGetScheme.mockReturnValue('https');

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description='https://example.com'
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('https://example.com');
        });

        it('should handle http scheme correctly', () => {
            mockGetScheme.mockReturnValue('http');

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description='http://example.com'
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('http://example.com');
        });

        it('should handle complex URLs with parameters', () => {
            mockGetScheme.mockReturnValue(null);
            const complexUrl = 'example.com/path?param=value&other=test';

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description={complexUrl}
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith(`https://${complexUrl}`);
        });
    });

    describe('phone type', () => {
        const phoneProps = {
            description: '+1234567890',
            linkType: 'phone',
            testID: 'test-phone',
        };

        it('should render phone link correctly', () => {
            renderWithIntlAndTheme(
                <UserProfileLink {...phoneProps}/>,
            );

            expect(screen.getByText('+1234567890')).toBeTruthy();
            expect(screen.getByTestId('test-phone.phone')).toBeTruthy();
        });

        it('should add tel: prefix when no scheme is present', () => {
            mockGetScheme.mockReturnValue(null);

            renderWithIntlAndTheme(
                <UserProfileLink {...phoneProps}/>,
            );

            const linkElement = screen.getByTestId('test-phone.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('tel:+1234567890');
        });

        it('should not add prefix when tel scheme is already present', () => {
            mockGetScheme.mockReturnValue('tel');

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...phoneProps}
                    description='tel:+1234567890'
                />,
            );

            const linkElement = screen.getByTestId('test-phone.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('tel:+1234567890');
        });

        it('should handle phone numbers without plus sign', () => {
            mockGetScheme.mockReturnValue(null);

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...phoneProps}
                    description='1234567890'
                />,
            );

            const linkElement = screen.getByTestId('test-phone.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('tel:1234567890');
        });

        it('should handle formatted phone numbers', () => {
            mockGetScheme.mockReturnValue(null);
            const formattedPhone = '+1 (234) 567-8900';

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...phoneProps}
                    description={formattedPhone}
                />,
            );

            const linkElement = screen.getByTestId('test-phone.phone');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith(`tel:${formattedPhone}`);
        });
    });

    describe('testID handling', () => {
        it('should generate correct testID for URL type', () => {
            renderWithIntlAndTheme(
                <UserProfileLink
                    description='example.com'
                    linkType='url'
                    testID='custom-test'
                />,
            );

            expect(screen.getByTestId('custom-test.url')).toBeTruthy();
        });

        it('should generate correct testID for phone type', () => {
            renderWithIntlAndTheme(
                <UserProfileLink
                    description='+1234567890'
                    linkType='phone'
                    testID='custom-test'
                />,
            );

            expect(screen.getByTestId('custom-test.phone')).toBeTruthy();
        });

        it('should handle undefined testID gracefully', () => {
            renderWithIntlAndTheme(
                <UserProfileLink
                    description='example.com'
                    linkType='url'
                />,
            );

            expect(screen.getByText('example.com')).toBeTruthy();
        });
    });

    describe('edge cases', () => {
        it('should handle empty description', () => {
            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description=''
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            expect(linkElement.props.children).toBe('');
        });

        it('should handle whitespace in description', () => {
            mockGetScheme.mockReturnValue(null);

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description='  example.com  '
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith('https://  example.com  ');
        });

        it('should handle special characters in URLs', () => {
            mockGetScheme.mockReturnValue(null);
            const specialUrl = 'example.com/path#section';

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description={specialUrl}
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledWith(`https://${specialUrl}`);
        });
    });

    describe('accessibility', () => {
        it('should be accessible as a touchable element', () => {
            renderWithIntlAndTheme(
                <UserProfileLink {...baseProps}/>,
            );

            const linkElement = screen.getByTestId('test-link.url');
            expect(linkElement).toBeTruthy();

            // The text element should be rendered and accessible
            expect(linkElement.type).toBe('Text');
        });

        it('should have proper text content for screen readers', () => {
            const {getByText} = renderWithIntlAndTheme(
                <UserProfileLink {...baseProps}/>,
            );

            expect(getByText('example.com')).toBeTruthy();
        });
    });

    describe('integration with URL utils', () => {
        it('should call getScheme with the correct description', () => {
            mockGetScheme.mockReturnValue(null);

            renderWithIntlAndTheme(
                <UserProfileLink {...baseProps}/>,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockGetScheme).toHaveBeenCalledWith('example.com');
        });

        it('should call tryOpenURL when pressed', () => {
            mockGetScheme.mockReturnValue('https');

            renderWithIntlAndTheme(
                <UserProfileLink
                    {...baseProps}
                    description='https://example.com'
                />,
            );

            const linkElement = screen.getByTestId('test-link.url');
            fireEvent.press(linkElement);

            expect(mockTryOpenURL).toHaveBeenCalledTimes(1);
        });
    });
});
