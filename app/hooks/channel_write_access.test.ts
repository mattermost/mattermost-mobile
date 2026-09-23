// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';

import {fetchChannelWriteAccess} from '@actions/remote/channel_access';
import {clearChannelWriteAccess, setChannelWriteDenied} from '@store/channel_write_access_store';

import {useChannelWriteAccess} from './channel_write_access';

jest.mock('@actions/remote/channel_access');

const serverUrl = 'https://appv1.mattermost.com';
const channelId = 'channel1';

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://appv1.mattermost.com',
}));

describe('useChannelWriteAccess', () => {
    afterEach(() => {
        clearChannelWriteAccess();
        jest.clearAllMocks();
    });

    it('should fetch the decision on mount and report not denied', () => {
        const {result} = renderHook(() => useChannelWriteAccess(channelId));

        expect(fetchChannelWriteAccess).toHaveBeenCalledWith(serverUrl, channelId);
        expect(result.current).toBe(false);
    });

    it('should report the stored decision', () => {
        const {result} = renderHook(() => useChannelWriteAccess(channelId));

        act(() => {
            setChannelWriteDenied(channelId, true);
        });
        expect(result.current).toBe(true);

        act(() => {
            setChannelWriteDenied(channelId, false);
        });
        expect(result.current).toBe(false);
    });

    it('should refetch when the decision is invalidated', () => {
        renderHook(() => useChannelWriteAccess(channelId));
        expect(fetchChannelWriteAccess).toHaveBeenCalledTimes(1);

        act(() => {
            clearChannelWriteAccess();
        });

        expect(fetchChannelWriteAccess).toHaveBeenCalledTimes(2);
    });

    it('should not fetch without a channel', () => {
        const {result} = renderHook(() => useChannelWriteAccess(''));

        expect(fetchChannelWriteAccess).not.toHaveBeenCalled();
        expect(result.current).toBe(false);
    });

    it('should stop reacting once unmounted', () => {
        const {unmount} = renderHook(() => useChannelWriteAccess(channelId));
        unmount();

        clearChannelWriteAccess();

        expect(fetchChannelWriteAccess).toHaveBeenCalledTimes(1);
    });
});
