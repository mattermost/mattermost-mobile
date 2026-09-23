// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

const getStore = () => require('./channel_write_access_store') as typeof import('./channel_write_access_store');

describe('ChannelWriteAccessStore', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('should report not denied for an unknown channel', async () => {
        const store = getStore();

        expect(await firstValueFrom(store.observeChannelWriteDenied('channel1'))).toBe(false);
    });

    it('should observe the denied flag set for a channel', async () => {
        const store = getStore();

        store.setChannelWriteDenied('channel1', true);
        expect(await firstValueFrom(store.observeChannelWriteDenied('channel1'))).toBe(true);

        store.setChannelWriteDenied('channel1', false);
        expect(await firstValueFrom(store.observeChannelWriteDenied('channel1'))).toBe(false);
    });

    it('should keep channels independent', async () => {
        const store = getStore();

        store.setChannelWriteDenied('channel1', true);

        expect(await firstValueFrom(store.observeChannelWriteDenied('channel1'))).toBe(true);
        expect(await firstValueFrom(store.observeChannelWriteDenied('channel2'))).toBe(false);
    });

    it('should clear a single channel and leave its siblings', async () => {
        const store = getStore();

        store.setChannelWriteDenied('channel1', true);
        store.setChannelWriteDenied('channel2', true);

        store.clearChannelWriteAccess('channel1');

        expect(await firstValueFrom(store.observeChannelWriteDenied('channel1'))).toBe(false);
        expect(await firstValueFrom(store.observeChannelWriteDenied('channel2'))).toBe(true);
    });

    it('should clear every channel when no channel is given', async () => {
        const store = getStore();

        store.setChannelWriteDenied('channel1', true);
        store.setChannelWriteDenied('channel2', true);

        store.clearChannelWriteAccess();

        expect(await firstValueFrom(store.observeChannelWriteDenied('channel1'))).toBe(false);
        expect(await firstValueFrom(store.observeChannelWriteDenied('channel2'))).toBe(false);
    });

    it('should increment the generation on each clear but not on a set', () => {
        const store = getStore();

        expect(store.getChannelWriteAccessGeneration()).toBe(0);

        store.setChannelWriteDenied('channel1', true);
        expect(store.getChannelWriteAccessGeneration()).toBe(0);

        store.clearChannelWriteAccess('channel1');
        expect(store.getChannelWriteAccessGeneration()).toBe(1);

        store.clearChannelWriteAccess();
        expect(store.getChannelWriteAccessGeneration()).toBe(2);
    });

    it('should not re-emit when an unrelated channel changes', () => {
        const store = getStore();
        const callback = jest.fn();

        const sub = store.observeChannelWriteDenied('channel1').subscribe(callback);
        expect(callback).toHaveBeenCalledTimes(1);

        store.setChannelWriteDenied('channel2', true);
        expect(callback).toHaveBeenCalledTimes(1);

        store.setChannelWriteDenied('channel1', true);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenLastCalledWith(true);

        sub.unsubscribe();
    });
});
