// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BottomSheetStore from './bottom_sheet_store';

describe('BottomSheetStore', () => {
    afterEach(() => {
        BottomSheetStore.reset();
    });

    it('should set and get render content callback', () => {
        expect(BottomSheetStore.getRenderContentCallback()).toBeUndefined();

        const mockCallback = jest.fn(() => null);
        BottomSheetStore.setRenderContentCallback(mockCallback);

        expect(BottomSheetStore.getRenderContentCallback()).toBe(mockCallback);
    });

    it('should remove render content callback', () => {
        const mockCallback = jest.fn(() => null);
        BottomSheetStore.setRenderContentCallback(mockCallback);
        expect(BottomSheetStore.getRenderContentCallback()).toBe(mockCallback);

        BottomSheetStore.removeRenderContentCallback();
        expect(BottomSheetStore.getRenderContentCallback()).toBeUndefined();
    });

    it('should set and get footer component', () => {
        expect(BottomSheetStore.getFooterComponent()).toBeUndefined();

        const mockFooter = jest.fn(() => null);
        BottomSheetStore.setFooterComponent(mockFooter);

        expect(BottomSheetStore.getFooterComponent()).toBe(mockFooter);
    });

    it('should remove footer component', () => {
        const mockFooter = jest.fn(() => null);
        BottomSheetStore.setFooterComponent(mockFooter);
        expect(BottomSheetStore.getFooterComponent()).toBe(mockFooter);

        BottomSheetStore.removeFooterComponent();
        expect(BottomSheetStore.getFooterComponent()).toBeUndefined();
    });

    it('should set and get snap points', () => {
        expect(BottomSheetStore.getSnapPoints()).toBeUndefined();

        const snapPoints = ['25%', '50%', '75%'];
        BottomSheetStore.setSnapPoints(snapPoints);

        expect(BottomSheetStore.getSnapPoints()).toBe(snapPoints);
    });

    it('should remove snap points', () => {
        const snapPoints = [100, 200, 300];
        BottomSheetStore.setSnapPoints(snapPoints);
        expect(BottomSheetStore.getSnapPoints()).toBe(snapPoints);

        BottomSheetStore.removeSnapPoints();
        expect(BottomSheetStore.getSnapPoints()).toBeUndefined();
    });

    it('should reset all stored values', () => {
        const mockCallback = jest.fn(() => null);
        const mockFooter = jest.fn(() => null);
        const snapPoints = ['50%', '100%'];

        BottomSheetStore.setRenderContentCallback(mockCallback);
        BottomSheetStore.setFooterComponent(mockFooter);
        BottomSheetStore.setSnapPoints(snapPoints);

        expect(BottomSheetStore.getRenderContentCallback()).toBe(mockCallback);
        expect(BottomSheetStore.getFooterComponent()).toBe(mockFooter);
        expect(BottomSheetStore.getSnapPoints()).toBe(snapPoints);

        BottomSheetStore.reset();

        expect(BottomSheetStore.getRenderContentCallback()).toBeUndefined();
        expect(BottomSheetStore.getFooterComponent()).toBeUndefined();
        expect(BottomSheetStore.getSnapPoints()).toBeUndefined();
    });
});
