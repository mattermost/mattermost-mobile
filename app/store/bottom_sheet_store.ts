// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import type React from 'react';

type KeyboardBehavior = 'extend' | 'fillParent' | 'interactive';

class BottomSheetStoreSingleton {
    private renderContentCallback?: () => React.ReactNode;
    private footerComponent?: (props: BottomSheetFooterProps) => React.ReactNode;
    private snapPoints?: Array<string | number>;
    private keyboardBehavior?: KeyboardBehavior;

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

    // Every sheet opened through bottomSheet() defaults to 'extend', which snaps
    // straight to the tallest configured snap point the instant a keyboard
    // shows. That is the wrong shape for a sheet holding a focusable text input:
    // it turns a compact sheet into a mostly-empty one instead of growing by
    // just the keyboard's own height. 'interactive' is what a caller needing
    // that should ask for instead — see channel_attribute_editor.
    public setKeyboardBehavior(behavior: KeyboardBehavior) {
        this.keyboardBehavior = behavior;
    }

    public getKeyboardBehavior() {
        return this.keyboardBehavior;
    }

    public removeKeyboardBehavior() {
        this.keyboardBehavior = undefined;
    }

    public reset() {
        this.removeRenderContentCallback();
        this.removeFooterComponent();
        this.removeSnapPoints();
        this.removeKeyboardBehavior();
    }
}

const BottomSheetStore = new BottomSheetStoreSingleton();
export default BottomSheetStore;
