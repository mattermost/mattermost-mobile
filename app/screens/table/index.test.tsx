// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import React from 'react';
import {StyleSheet, Text} from 'react-native';

import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Table from './index';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

const TABLE_HORIZONTAL_PADDING = 10;

describe('Table screen', () => {
    afterEach(() => {
        CallbackStore.removeCallback();
    });

    it('should size flex tables to the viewport minus horizontal padding', () => {
        CallbackStore.setCallback(() => <Text>{'cell'}</Text>);

        const {getByTestId} = renderWithIntlAndTheme(
            <Table
                renderAsFlex={true}
                width={576}
            />,
        );

        const {width: windowWidth} = RNUtils.getWindowDimensions();
        expect(StyleSheet.flatten(getByTestId('table.scroll_view').props.contentContainerStyle)).toEqual({
            width: windowWidth - TABLE_HORIZONTAL_PADDING,
        });
    });

    it('should keep the explicit width for non-flex tables', () => {
        CallbackStore.setCallback(() => <Text>{'cell'}</Text>);

        const {getByTestId} = renderWithIntlAndTheme(
            <Table
                renderAsFlex={false}
                width={1536}
            />,
        );

        expect(StyleSheet.flatten(getByTestId('table.scroll_view').props.contentContainerStyle)).toEqual({
            width: 1536,
        });
    });
});
