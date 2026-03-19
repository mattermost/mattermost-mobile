// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import WorkspaceOptionRow from './workspace_option_row';

describe('WorkspaceOptionRow', () => {
    it('should render display_name when present', () => {
        const remote = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'My Workspace'});
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <WorkspaceOptionRow
                remote={remote}
                onSelect={jest.fn()}
            />,
        );
        expect(getByText('My Workspace')).toBeTruthy();
        expect(getByTestId('channel_share.workspace_option.r1')).toBeTruthy();
    });

    it('should render name when display_name is not set', () => {
        const remote = TestHelper.fakeRemoteClusterInfo({remote_id: 'r2', display_name: '', name: 'fallback-name'});
        const {getByText} = renderWithIntlAndTheme(
            <WorkspaceOptionRow
                remote={remote}
                onSelect={jest.fn()}
            />,
        );
        expect(getByText('fallback-name')).toBeTruthy();
    });

    it('should call onSelect with remote when pressed', () => {
        const remote = TestHelper.fakeRemoteClusterInfo({remote_id: 'r1', display_name: 'Remote One'});
        const onSelect = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <WorkspaceOptionRow
                remote={remote}
                onSelect={onSelect}
            />,
        );
        fireEvent.press(getByTestId('channel_share.workspace_option.r1'));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(remote);
    });
});
