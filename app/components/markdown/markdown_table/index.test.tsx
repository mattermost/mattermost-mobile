// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';

import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import MarkdownTable from './index';

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => {
    const {View: MockView} = require('react-native');
    return {LinearGradient: MockView};
});

function tableRows(numColumns: number) {
    return (
        <View>
            {Array.from({length: numColumns}, (_, index) => (
                <View key={index}/>
            ))}
        </View>
    );
}

describe('MarkdownTable', () => {
    beforeEach(() => {
        jest.mocked(navigateToScreen).mockClear();
    });

    const originalOS = Platform.OS;

    afterEach(() => {
        Platform.OS = originalOS;
        CallbackStore.removeCallback();
    });

    it('should open a 3-column full table as flex on iOS', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <MarkdownTable numColumns={3}>
                {tableRows(3)}
            </MarkdownTable>,
        );

        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.press(getByTestId('markdown_table'));

        expect(navigateToScreen).toHaveBeenCalledWith(
            Screens.TABLE,
            expect.objectContaining({renderAsFlex: true}),
        );
    });

    it('should open an 8-column full table with an explicit width', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <MarkdownTable numColumns={8}>
                {tableRows(8)}
            </MarkdownTable>,
        );

        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.press(getByTestId('markdown_table'));

        expect(navigateToScreen).toHaveBeenCalledWith(
            Screens.TABLE,
            expect.objectContaining({renderAsFlex: false}),
        );
    });

    it('should keep Android expanded tables on an explicit width', async () => {
        Platform.OS = 'android';

        const {getByTestId} = renderWithIntlAndTheme(
            <MarkdownTable numColumns={3}>
                {tableRows(3)}
            </MarkdownTable>,
        );

        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.press(getByTestId('markdown_table'));

        expect(navigateToScreen).toHaveBeenCalledWith(
            Screens.TABLE,
            expect.objectContaining({renderAsFlex: false}),
        );
    });

    it('should not flex-size full-view tables so tall content can scroll', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <MarkdownTable numColumns={3}>
                {tableRows(3)}
            </MarkdownTable>,
        );

        await act(async () => {
            await Promise.resolve();
        });

        const previewStyle = StyleSheet.flatten(getByTestId('markdown_table.preview_rows').props.style);
        expect(previewStyle.flex).toBe(1);

        fireEvent.press(getByTestId('markdown_table'));
        const renderRows = CallbackStore.getCallback<(isFullView?: boolean) => React.ReactNode>();
        const {getByTestId: getFull} = renderWithIntlAndTheme(<>{renderRows?.(true)}</>);
        const fullStyle = StyleSheet.flatten(getFull('markdown_table.full_rows').props.style);

        expect(fullStyle.flex).toBeUndefined();
        expect(fullStyle.width).toBe('100%');
    });
});
