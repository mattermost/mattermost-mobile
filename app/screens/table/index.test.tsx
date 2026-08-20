// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import React from 'react';
import {Platform, StyleSheet, Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Table from './index';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

const TABLE_HORIZONTAL_PADDING = 10;

describe('Table screen', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
        Platform.OS = originalOS;
        CallbackStore.removeCallback();
    });

    it('should size iOS flex tables to the safe viewport', () => {
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

    it('should subtract horizontal safe-area insets from iOS flex table width', () => {
        CallbackStore.setCallback(() => <Text>{'cell'}</Text>);

        const {getByTestId} = renderWithIntlAndTheme(
            <SafeAreaProvider
                initialMetrics={{
                    frame: {x: 0, y: 0, width: 844, height: 390},
                    insets: {top: 0, left: 47, right: 47, bottom: 21},
                }}
            >
                <Table
                    renderAsFlex={true}
                    width={576}
                />
            </SafeAreaProvider>,
        );

        const {width: windowWidth} = RNUtils.getWindowDimensions();
        expect(StyleSheet.flatten(getByTestId('table.scroll_view').props.contentContainerStyle)).toEqual({
            width: windowWidth - 47 - 47 - TABLE_HORIZONTAL_PADDING,
        });
    });

    it('should keep Android flex tables on flex:1', () => {
        Platform.OS = 'android';
        CallbackStore.setCallback(() => <Text>{'cell'}</Text>);

        const {getByTestId} = renderWithIntlAndTheme(
            <Table
                renderAsFlex={true}
                width={576}
            />,
        );

        expect(StyleSheet.flatten(getByTestId('table.scroll_view').props.contentContainerStyle)).toEqual({
            flex: 1,
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
