// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallbackStore from './callback_store';

describe('CallbackStore', () => {
    afterEach(() => {
        CallbackStore.removeCallback();
    });

    it('should set and get callback', () => {
        expect(CallbackStore.getCallback()).toBeUndefined();

        const mockCallback = jest.fn();
        CallbackStore.setCallback(mockCallback);

        expect(CallbackStore.getCallback()).toBe(mockCallback);
    });

    it('should handle typed callbacks', () => {
        type MyCallback = (value: string) => void;

        const typedCallback: MyCallback = jest.fn();
        CallbackStore.setCallback<MyCallback>(typedCallback);

        const retrieved = CallbackStore.getCallback<MyCallback>();
        expect(retrieved).toBe(typedCallback);
    });

    it('should remove callback', () => {
        const mockCallback = jest.fn();
        CallbackStore.setCallback(mockCallback);
        expect(CallbackStore.getCallback()).toBe(mockCallback);

        CallbackStore.removeCallback();
        expect(CallbackStore.getCallback()).toBeUndefined();
    });

    it('should replace existing callback', () => {
        const firstCallback = jest.fn();
        const secondCallback = jest.fn();

        CallbackStore.setCallback(firstCallback);
        expect(CallbackStore.getCallback()).toBe(firstCallback);

        CallbackStore.setCallback(secondCallback);
        expect(CallbackStore.getCallback()).toBe(secondCallback);
    });
});
