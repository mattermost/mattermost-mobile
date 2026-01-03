// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import type React from 'react';

class BottomSheetStoreSingleton {
    private renderContentCallback?: () => React.ReactNode;
    private footerComponent?: (props: BottomSheetFooterProps) => React.ReactNode;
    private snapPoints?: Array<string | number>;

    public setRenderContentCallback(callback: () => React.ReactNode) {
        this.renderContentCallback = callback;
    }

    public getRenderContentCallback() {
        return this.renderContentCallback;
    }

    public removeRenderContentCallback() {
        this.renderContentCallback = undefined;
    }

    public setFooterComponent(callback: (props: BottomSheetFooterProps) => React.ReactNode) {
        this.footerComponent = callback;
    }

    public getFooterComponent() {
        return this.footerComponent;
    }

    public removeFooterComponent() {
        this.footerComponent = undefined;
    }

    public setSnapPoints(snapPoints: Array<string | number>) {
        this.snapPoints = snapPoints;
    }

    public getSnapPoints() {
        return this.snapPoints;
    }

    public removeSnapPoints() {
        this.snapPoints = undefined;
    }

    public reset() {
        this.removeRenderContentCallback();
        this.removeFooterComponent();
        this.removeSnapPoints();
    }
}

const BottomSheetStore = new BottomSheetStoreSingleton();
export default BottomSheetStore;
