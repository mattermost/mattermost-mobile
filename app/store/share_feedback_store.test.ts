// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ShareFeedbackStore from './share_feedback_store';

describe('ShareFeedbackStore', () => {
    afterEach(() => {
        ShareFeedbackStore.dismiss();
    });

    it('should have initial state with visible false', () => {
        const state = ShareFeedbackStore.getState();

        expect(state.visible).toBe(false);
    });

    it('should show share feedback overlay', () => {
        ShareFeedbackStore.show();

        const state = ShareFeedbackStore.getState();
        expect(state.visible).toBe(true);
    });

    it('should dismiss share feedback overlay', () => {
        ShareFeedbackStore.show();
        expect(ShareFeedbackStore.getState().visible).toBe(true);

        ShareFeedbackStore.dismiss();

        const state = ShareFeedbackStore.getState();
        expect(state.visible).toBe(false);
    });

    it('should allow multiple show calls', () => {
        ShareFeedbackStore.show();
        expect(ShareFeedbackStore.getState().visible).toBe(true);

        ShareFeedbackStore.show();
        expect(ShareFeedbackStore.getState().visible).toBe(true);
    });

    it('should emit values through observable', () => {
        const mockCallback = jest.fn();
        const subscription = ShareFeedbackStore.observe().subscribe(mockCallback);

        // Should immediately get current state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
        });

        ShareFeedbackStore.show();

        // Should get new state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: true,
        });

        ShareFeedbackStore.dismiss();

        // Should get dismissed state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
        });

        expect(mockCallback).toHaveBeenCalledTimes(3);

        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        ShareFeedbackStore.show();
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });
});
