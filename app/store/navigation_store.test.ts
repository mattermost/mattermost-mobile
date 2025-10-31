// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';

import NavigationStore from './navigation_store';

describe('NavigationStore', () => {
    beforeEach(() => {
        NavigationStore.reset();
    });

    describe('screen management', () => {
        it('should add and get screens correctly', () => {
            NavigationStore.addScreenToStack(Screens.ABOUT);
            NavigationStore.addScreenToStack(Screens.ACCOUNT);

            expect(NavigationStore.getScreensInStack()).toEqual([Screens.ACCOUNT, Screens.ABOUT]);
            expect(NavigationStore.getVisibleScreen()).toBe(Screens.ACCOUNT);
        });

        it('should remove screens correctly', () => {
            NavigationStore.addScreenToStack(Screens.ABOUT);
            NavigationStore.addScreenToStack(Screens.ACCOUNT);
            NavigationStore.removeScreenFromStack(Screens.ACCOUNT);

            expect(NavigationStore.getScreensInStack()).toEqual([Screens.ABOUT]);
            expect(NavigationStore.getVisibleScreen()).toBe(Screens.ABOUT);
        });

        it('should clear screens correctly', () => {
            NavigationStore.addScreenToStack(Screens.ABOUT);
            NavigationStore.addScreenToStack(Screens.ACCOUNT);
            NavigationStore.clearScreensFromStack();

            expect(NavigationStore.getScreensInStack()).toEqual([]);
            expect(NavigationStore.getVisibleScreen()).toBeUndefined();
        });

        it('should pop to screen correctly', () => {
            NavigationStore.addScreenToStack(Screens.ABOUT);
            NavigationStore.addScreenToStack(Screens.ACCOUNT);
            NavigationStore.addScreenToStack(Screens.CHANNEL);
            NavigationStore.popTo(Screens.ABOUT);

            expect(NavigationStore.getScreensInStack()).toEqual([Screens.ABOUT]);
            expect(NavigationStore.getVisibleScreen()).toBe(Screens.ABOUT);
        });
    });

    describe('modal management', () => {
        it('should add and get modals correctly', () => {
            NavigationStore.addModalToStack(Screens.EDIT_POST);
            NavigationStore.addModalToStack(Screens.EDIT_PROFILE);

            expect(NavigationStore.getModalsInStack()).toEqual([Screens.EDIT_PROFILE, Screens.EDIT_POST]);
            expect(NavigationStore.getVisibleModal()).toBe(Screens.EDIT_PROFILE);
            expect(NavigationStore.hasModalsOpened()).toBe(true);
        });

        it('should remove modals correctly', () => {
            NavigationStore.addModalToStack(Screens.EDIT_POST);
            NavigationStore.addModalToStack(Screens.EDIT_PROFILE);
            NavigationStore.removeModalFromStack(Screens.EDIT_PROFILE);

            expect(NavigationStore.getModalsInStack()).toEqual([Screens.EDIT_POST]);
            expect(NavigationStore.getVisibleModal()).toBe(Screens.EDIT_POST);
        });

        it('should handle duplicate modal additions', () => {
            NavigationStore.addModalToStack(Screens.EDIT_POST);
            NavigationStore.addModalToStack(Screens.EDIT_POST);

            expect(NavigationStore.getModalsInStack()).toEqual([Screens.EDIT_POST]);
        });
    });

    describe('tab management', () => {
        it('should manage visible tab correctly', () => {
            expect(NavigationStore.getVisibleTab()).toBe('Home');

            NavigationStore.setVisibleTap('Channel');
            expect(NavigationStore.getVisibleTab()).toBe('Channel');
        });
    });

    describe('ToS management', () => {
        it('should manage ToS state correctly', () => {
            expect(NavigationStore.isToSOpen()).toBe(false);

            NavigationStore.setToSOpen(true);
            expect(NavigationStore.isToSOpen()).toBe(true);

            NavigationStore.setToSOpen(false);
            expect(NavigationStore.isToSOpen()).toBe(false);
        });
    });

    describe('subject management', () => {
        it('should notify subscribers of screen changes', () => {
            const mockNext = jest.fn();
            const subscription = NavigationStore.getSubject().subscribe({
                next: mockNext,
            });

            NavigationStore.addScreenToStack(Screens.ABOUT);
            expect(mockNext).toHaveBeenCalledWith(Screens.ABOUT);

            NavigationStore.removeScreenFromStack(Screens.ABOUT);
            expect(mockNext).toHaveBeenCalledWith(undefined);

            subscription.unsubscribe();
        });
    });

    describe('screen loading and visibility', () => {
        it('should handle waitUntilScreenHasLoaded', async () => {
            const promise = NavigationStore.waitUntilScreenHasLoaded(Screens.ABOUT);
            NavigationStore.addScreenToStack(Screens.ABOUT);

            await promise;
            expect(NavigationStore.getScreensInStack()).toContain(Screens.ABOUT);
        });

        it('should handle waitUntilScreenIsTop', async () => {
            const promise = NavigationStore.waitUntilScreenIsTop(Screens.ABOUT);
            NavigationStore.addScreenToStack(Screens.CHANNEL);
            NavigationStore.addScreenToStack(Screens.ABOUT);

            await promise;
            expect(NavigationStore.getVisibleScreen()).toBe(Screens.ABOUT);
        });

        it('should handle waitUntilScreensIsRemoved', async () => {
            NavigationStore.addScreenToStack(Screens.ABOUT);
            const promise = NavigationStore.waitUntilScreensIsRemoved(Screens.ABOUT);
            NavigationStore.removeScreenFromStack(Screens.ABOUT);

            await promise;
            expect(NavigationStore.getScreensInStack()).not.toContain(Screens.ABOUT);
        });
    });
});
