// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import WorkspaceItem, {type SharedChannelWorkspace} from './workspace_item';

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));

describe('WorkspaceItem', () => {
    it('renders workspace name, online status and remove button', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({display_name: 'My Remote', remote_id: 'r1'}),
            status: 'saved',
        };
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={jest.fn()}
                isFirst={true}
            />,
        );
        expect(getByText('My Remote')).toBeTruthy();
        expect(getByText('Online')).toBeTruthy();
        expect(getByTestId('channel_share.remove.r1')).toBeTruthy();
    });

    it('calls onRemove with item when remove button is pressed', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({remote_id: 'r1'}),
            status: 'saved',
        };
        const onRemove = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={onRemove}
                isFirst={false}
            />,
        );
        fireEvent.press(getByTestId('channel_share.remove.r1'));
        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onRemove).toHaveBeenCalledWith(item);
    });

    it('does not call onRemove when remove button is pressed and removeDisabled is true', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({remote_id: 'r1'}),
            status: 'saved',
        };
        const onRemove = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={onRemove}
                isFirst={false}
                removeDisabled={true}
            />,
        );
        fireEvent.press(getByTestId('channel_share.remove.r1'));
        expect(onRemove).not.toHaveBeenCalled();
    });

    it('shows Connection pending when connection is not confirmed', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({site_url: 'pending_abc', last_ping_at: 0, display_name: 'Pending'}),
            status: 'saved',
        };
        const {getByText} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={jest.fn()}
                isFirst={true}
            />,
        );
        expect(getByText('Pending')).toBeTruthy();
        expect(getByText('Connection pending')).toBeTruthy();
    });

    it('shows Pending save when status is pending', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({display_name: 'New Workspace', remote_id: 'r1'}),
            status: 'pending',
        };
        const {getByText} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={jest.fn()}
                isFirst={true}
            />,
        );
        expect(getByText('New Workspace')).toBeTruthy();
        expect(getByText('Pending save')).toBeTruthy();
    });

    it('shows Saving when status is saving', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({display_name: 'Syncing', remote_id: 'r1'}),
            status: 'saving',
        };
        const {getByText} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={jest.fn()}
                isFirst={true}
            />,
        );
        expect(getByText('Syncing')).toBeTruthy();
        expect(getByText('Saving')).toBeTruthy();
    });

    it('shows Online when status is saved and connection is recent', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({display_name: 'Live Remote', remote_id: 'r1', last_ping_at: Date.now()}),
            status: 'saved',
        };
        const {getByText} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={jest.fn()}
                isFirst={true}
            />,
        );
        expect(getByText('Live Remote')).toBeTruthy();
        expect(getByText('Online')).toBeTruthy();
    });

    it('shows Offline when status is saved and last_ping_at is stale', () => {
        const item: SharedChannelWorkspace = {
            ...TestHelper.fakeRemoteClusterInfo({
                display_name: 'Gone Remote',
                remote_id: 'r1',
                last_ping_at: 0,
                site_url: 'https://remote.example.com',
            }),
            status: 'saved',
        };
        const {getByText} = renderWithIntlAndTheme(
            <WorkspaceItem
                item={item}
                onRemove={jest.fn()}
                isFirst={true}
            />,
        );
        expect(getByText('Gone Remote')).toBeTruthy();
        expect(getByText('Offline')).toBeTruthy();
    });
});
