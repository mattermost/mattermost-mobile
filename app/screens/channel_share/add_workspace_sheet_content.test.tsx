// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AddWorkspaceSheetContent, {getAddWorkspaceSheetContentHeight} from './add_workspace_sheet_content';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
}));
jest.mock('@hooks/bottom_sheet_lists_fix', () => ({
    useBottomSheetListsFix: jest.fn(() => ({
        enabled: true,
        panResponder: {panHandlers: {}},
    })),
}));
jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetScrollView: require('react-native').ScrollView,
}));

describe('AddWorkspaceSheetContent', () => {
    it('shows empty message when available is empty', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <AddWorkspaceSheetContent
                available={[]}
                onSelect={jest.fn()}
            />,
        );
        expect(getByTestId('channel_share.add_workspace_sheet.empty')).toBeTruthy();
        expect(getByText('All connected workspaces are already sharing this channel.')).toBeTruthy();
    });

    it('renders workspace options and calls onSelect when one is pressed', () => {
        const r1 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote One'});
        const r2 = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: 'Remote Two'});
        const onSelect = jest.fn();
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <AddWorkspaceSheetContent
                available={[r1, r2]}
                onSelect={onSelect}
            />,
        );
        expect(getByText('Remote One')).toBeTruthy();
        expect(getByText('Remote Two')).toBeTruthy();
        fireEvent.press(getByTestId('channel_share.workspace_option.r1'));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(r1);
        fireEvent.press(getByTestId('channel_share.workspace_option.r2'));
        expect(onSelect).toHaveBeenCalledWith(r2);
    });
});

describe('getAddWorkspaceSheetContentHeight', () => {
    it('returns height including header when not tablet and empty list', () => {
        const height = getAddWorkspaceSheetContentHeight(false, 0);
        expect(height).toBeGreaterThan(0);
        expect(typeof height).toBe('number');
    });

    it('returns greater height for more elements when not tablet', () => {
        const heightEmpty = getAddWorkspaceSheetContentHeight(false, 0);
        const heightTwo = getAddWorkspaceSheetContentHeight(false, 2);
        expect(heightTwo).toBeGreaterThan(heightEmpty);
    });

    it('returns smaller height when tablet (no header) for same element count', () => {
        const heightPhone = getAddWorkspaceSheetContentHeight(false, 0);
        const heightTablet = getAddWorkspaceSheetContentHeight(true, 0);
        expect(heightTablet).toBeLessThan(heightPhone);
    });

    it('returns same height for high element counts (capped for scroll)', () => {
        const heightFive = getAddWorkspaceSheetContentHeight(false, 5);
        const heightTen = getAddWorkspaceSheetContentHeight(false, 10);
        const heightHundred = getAddWorkspaceSheetContentHeight(false, 100);
        expect(heightTen).toBe(heightFive);
        expect(heightHundred).toBe(heightFive);
    });
});
