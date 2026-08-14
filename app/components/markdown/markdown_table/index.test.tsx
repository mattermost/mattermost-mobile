// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
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

    it('should open a 3-column full table as flex on a phone', async () => {
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
});
