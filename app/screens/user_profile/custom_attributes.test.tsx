// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CustomAttributes from './custom_attributes';

import type {CustomAttribute} from '@typings/api/custom_profile_attributes';

describe('CustomAttributes', () => {
    const defaultProps = {
        nickname: undefined,
        position: undefined,
        localTime: undefined,
        customAttributes: undefined,
    };

    it('renders empty component when no props are provided', () => {
        renderWithIntlAndTheme(
            <CustomAttributes {...defaultProps}/>,
        );

        // Should not display any attributes when all props are undefined
        expect(screen.queryByText('Nickname')).toBeNull();
        expect(screen.queryByText('Position')).toBeNull();
        expect(screen.queryByText('Local Time')).toBeNull();
    });

    it('renders nickname attribute when provided', () => {
        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                nickname='TestNickname'
            />,
        );

        expect(screen.getByText('Nickname')).toBeVisible();
        expect(screen.getByText('TestNickname')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.nickname.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.nickname.text')).toBeVisible();
    });

    it('renders position attribute when provided', () => {
        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                position='Software Engineer'
            />,
        );

        expect(screen.getByText('Position')).toBeVisible();
        expect(screen.getByText('Software Engineer')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.position.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.position.text')).toBeVisible();
    });

    it('renders local time attribute when provided', () => {
        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                localTime='2:00 PM'
            />,
        );

        expect(screen.getByText('Local Time')).toBeVisible();
        expect(screen.getByText('2:00 PM')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.local_time.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.local_time.text')).toBeVisible();
    });

    it('renders custom attributes when provided', () => {
        const customAttributes: CustomAttribute[] = [
            {
                id: 'custom1',
                name: 'Department',
                type: 'text',
                value: 'Engineering',
            },
            {
                id: 'custom2',
                name: 'Office Location',
                type: 'text',
                value: 'New York',
            },
        ];

        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                customAttributes={customAttributes}
            />,
        );

        expect(screen.getByText('Department')).toBeVisible();
        expect(screen.getByText('Engineering')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.custom1.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.custom1.text')).toBeVisible();

        expect(screen.getByText('Office Location')).toBeVisible();
        expect(screen.getByText('New York')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.custom2.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.custom2.text')).toBeVisible();
    });

    it('renders custom attributes with different types correctly', () => {
        const customAttributes: CustomAttribute[] = [
            {
                id: 'url_field',
                name: 'Website',
                type: 'url',
                value: 'https://example.com',
            },
            {
                id: 'phone_field',
                name: 'Phone',
                type: 'phone',
                value: '+1234567890',
            },
            {
                id: 'select_field',
                name: 'Team',
                type: 'select',
                value: 'Frontend',
            },
        ];

        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                customAttributes={customAttributes}
            />,
        );

        expect(screen.getByText('Website')).toBeVisible();
        expect(screen.getByText('https://example.com')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.url_field.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.url_field.url')).toBeVisible();

        expect(screen.getByText('Phone')).toBeVisible();
        expect(screen.getByText('+1234567890')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.phone_field.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.phone_field.phone')).toBeVisible();

        expect(screen.getByText('Team')).toBeVisible();
        expect(screen.getByText('Frontend')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.select_field.title')).toBeVisible();
        expect(screen.getByTestId('custom_attribute.select_field.select')).toBeVisible();
    });

    it('renders all standard and custom attributes together', () => {
        const customAttributes: CustomAttribute[] = [
            {
                id: 'custom_field',
                name: 'Skills',
                type: 'text',
                value: 'React, TypeScript',
            },
        ];

        renderWithIntlAndTheme(
            <CustomAttributes
                nickname='JohnDoe'
                position='Senior Developer'
                localTime='3:30 PM'
                customAttributes={customAttributes}
            />,
        );

        // Standard attributes
        expect(screen.getByText('Nickname')).toBeVisible();
        expect(screen.getByText('JohnDoe')).toBeVisible();
        expect(screen.getByText('Position')).toBeVisible();
        expect(screen.getByText('Senior Developer')).toBeVisible();
        expect(screen.getByText('Local Time')).toBeVisible();
        expect(screen.getByText('3:30 PM')).toBeVisible();

        // Custom attributes
        expect(screen.getByText('Skills')).toBeVisible();
        expect(screen.getByText('React, TypeScript')).toBeVisible();
    });

    it('handles empty custom attributes array', () => {
        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                customAttributes={[]}
            />,
        );

        // Should not display any attributes when custom attributes is empty array
        expect(screen.queryByText('Department')).toBeNull();
        expect(screen.queryByText('Skills')).toBeNull();
    });

    it('filters out empty standard attributes correctly', () => {
        renderWithIntlAndTheme(
            <CustomAttributes
                nickname=''
                position='Developer'
                localTime=''
                customAttributes={undefined}
            />,
        );

        // Only position should be visible since nickname and localTime are empty strings
        expect(screen.getByText('Position')).toBeVisible();
        expect(screen.getByText('Developer')).toBeVisible();

        // Empty strings should not create attributes
        expect(screen.queryByText('Nickname')).toBeNull();
        expect(screen.queryByText('Local Time')).toBeNull();
    });

    it('renders FlatList with correct props', () => {
        const customAttributes: CustomAttribute[] = [
            {
                id: 'test1',
                name: 'Test Field',
                type: 'text',
                value: 'Test Value',
            },
        ];

        renderWithIntlAndTheme(
            <CustomAttributes
                {...defaultProps}
                customAttributes={customAttributes}
            />,
        );

        // Check that the FlatList is rendered (by checking if the data is displayed)
        expect(screen.getByText('Test Field')).toBeVisible();
        expect(screen.getByText('Test Value')).toBeVisible();
    });

    it('handles partial standard attributes correctly', () => {
        renderWithIntlAndTheme(
            <CustomAttributes
                nickname='TestUser'
                position={undefined}
                localTime='4:00 PM'
                customAttributes={undefined}
            />,
        );

        // Only nickname and localTime should be visible
        expect(screen.getByText('Nickname')).toBeVisible();
        expect(screen.getByText('TestUser')).toBeVisible();
        expect(screen.getByText('Local Time')).toBeVisible();
        expect(screen.getByText('4:00 PM')).toBeVisible();

        // Position should not be visible since it's undefined
        expect(screen.queryByText('Position')).toBeNull();
    });
});
