// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ReviewAppStore from './review_app_store';

describe('ReviewAppStore', () => {
    afterEach(() => {
        ReviewAppStore.dismiss();
    });

    it('should have initial state with visible false and hasAskedBefore false', () => {
        const state = ReviewAppStore.getState();

        expect(state.visible).toBe(false);
        expect(state.hasAskedBefore).toBe(false);
    });

    it('should show review app overlay', () => {
        ReviewAppStore.show(false);

        const state = ReviewAppStore.getState();
        expect(state.visible).toBe(true);
        expect(state.hasAskedBefore).toBe(false);
    });

    it('should show review app overlay with hasAskedBefore flag', () => {
        ReviewAppStore.show(true);

        const state = ReviewAppStore.getState();
        expect(state.visible).toBe(true);
        expect(state.hasAskedBefore).toBe(true);
    });

    it('should dismiss review app overlay', () => {
        ReviewAppStore.show(true);
        expect(ReviewAppStore.getState().visible).toBe(true);

        ReviewAppStore.dismiss();

        const state = ReviewAppStore.getState();
        expect(state.visible).toBe(false);
        expect(state.hasAskedBefore).toBe(false);
    });

    it('should replace existing state with new show call', () => {
        ReviewAppStore.show(false);
        expect(ReviewAppStore.getState().hasAskedBefore).toBe(false);

        ReviewAppStore.show(true);
        const state = ReviewAppStore.getState();
        expect(state.visible).toBe(true);
        expect(state.hasAskedBefore).toBe(true);
    });

    it('should emit values through observable', () => {
        const mockCallback = jest.fn();
        const subscription = ReviewAppStore.observe().subscribe(mockCallback);

        // Should immediately get current state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
            hasAskedBefore: false,
        });

        ReviewAppStore.show(true);

        // Should get new state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: true,
            hasAskedBefore: true,
        });

        ReviewAppStore.dismiss();

        // Should get dismissed state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
            hasAskedBefore: false,
        });

        expect(mockCallback).toHaveBeenCalledTimes(3);

        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        ReviewAppStore.show(false);
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });
});
