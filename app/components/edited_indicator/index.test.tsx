// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditedIndicator from './index';

describe('components/EditedIndicator', () => {
    const baseProps = {
        baseTextStyle: {fontSize: 16, color: '#000'},
        theme: Preferences.THEMES.denim,
        context: ['paragraph'],
        testID: 'edited-indicator-test',
    };

    it('should render with default props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <EditedIndicator {...baseProps}/>,
        );

        const indicator = getByTestId('edited-indicator-test');
        expect(indicator).toBeTruthy();
        expect(indicator.props.children).toEqual([
            '  ', // spacer for paragraph context
            expect.objectContaining({
                props: expect.objectContaining({
                    name: 'pencil-outline',
                    size: 14, // default icon size
                }),
            }),
            expect.objectContaining({
                props: expect.objectContaining({
                    id: 'post_message_view.edited',
                    defaultMessage: 'Edited',
                }),
            }),
        ]);
    });

    it('should render with custom icon size', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <EditedIndicator
                {...baseProps}
                iconSize={20}
            />,
        );

        const indicator = getByTestId('edited-indicator-test');
        const icon = indicator.props.children[1];
        expect(icon.props.size).toBe(20);
    });

    it('should render with custom testID', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <EditedIndicator
                {...baseProps}
                testID='custom-test-id'
            />,
        );

        expect(getByTestId('custom-test-id')).toBeTruthy();
    });

    describe('component structure', () => {
        it('should render pencil-outline icon', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <EditedIndicator {...baseProps}/>,
            );

            const indicator = getByTestId('edited-indicator-test');
            const icon = indicator.props.children[1];
            expect(icon.props.name).toBe('pencil-outline');
        });

        it('should render "Edited" text with correct props', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <EditedIndicator {...baseProps}/>,
            );

            const indicator = getByTestId('edited-indicator-test');
            const formattedText = indicator.props.children[2];
            expect(formattedText.props.id).toBe('post_message_view.edited');
            expect(formattedText.props.defaultMessage).toBe('Edited');
        });
    });

    describe('edge cases', () => {
        it('should handle empty context array', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <EditedIndicator
                    {...baseProps}
                    context={[]}
                />,
            );

            const indicator = getByTestId('edited-indicator-test');
            expect(indicator.props.children[0]).toBe('');
        });

        it('should handle undefined context elements', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <EditedIndicator
                    {...baseProps}
                    context={[undefined] as any}
                    checkHeadings={true}
                />,
            );

            const indicator = getByTestId('edited-indicator-test');
            expect(indicator.props.children[0]).toBe('');
        });

        it('should handle context with multiple elements', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <EditedIndicator
                    {...baseProps}
                    context={['paragraph', 'strong', 'em']}
                />,
            );

            const indicator = getByTestId('edited-indicator-test');
            expect(indicator.props.children[0]).toBe('  ');
        });
    });
});
