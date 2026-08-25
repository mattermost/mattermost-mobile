// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Modal, Platform, Pressable, StatusBar, StyleSheet, View, useWindowDimensions} from 'react-native';

import {isAndroidEdgeToEdge} from '@constants/device';
import {useTutorial} from '@context/tutorial';

import HighlightItem from './item';

type Props = {
    children?: React.ReactNode;
    itemRef: React.RefObject<View | null>;
    itemBorderRadius?: number;
    onDismiss: () => void;
    onShow?: () => void;
    inModal?: boolean;
}

const EMPTY_BOUNDS: TutorialItemBounds = {startX: 0, startY: 0, endX: 0, endY: 0};

const TutorialHighlight = ({children, itemRef, itemBorderRadius, inModal, onDismiss, onShow}: Props) => {
    const {width, height} = useWindowDimensions();
    const {rootOffset} = useTutorial();
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>(EMPTY_BOUNDS);

    const onRootLayout = useCallback(() => {
        itemRef.current?.measure((x, y, w, h, pageX, pageY) => {
            let offset = inModal && Platform.OS === 'ios' ? rootOffset : 0;
            if (!isAndroidEdgeToEdge && StatusBar.currentHeight) {
                offset = StatusBar.currentHeight;
            }

            setItemBounds({
                startX: pageX,
                startY: pageY + offset,
                endX: pageX + w,
                endY: pageY + h + offset,
            });
        });
    }, [itemRef, inModal, rootOffset]);

    const handleShowTutorial = useCallback(() => {
        if (onShow) {
            setTimeout(onShow, 1000);
        }
    }, [onShow]);

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType='fade'
            onDismiss={onDismiss}
            onRequestClose={onDismiss}
            testID='tutorial_highlight'
            statusBarTranslucent={true}
        >
            <View
                style={{flex: 1}}
                onLayout={onRootLayout}
                testID='tutorial_highlight.overlay'
            >
                {/*
                  * Dismiss target. HighlightItem's only press handler is `onPress` on the
                  * react-native-svg root, which routes through RNSVG's own responder on
                  * RNSVGSvgView and does not fire for a synthetic tap: on iOS shard 19 of
                  * run 32821677136 both `tap(tutorial_highlight.backdrop)` and
                  * `tap(tutorial_highlight)` returned success and the overlay stayed up,
                  * with testFnFailure.png still showing it. TutorialSwipeLeft cannot serve
                  * either — its root sets pointerEvents='none', so neither it nor its
                  * subviews can ever be the touch target.
                  *
                  * The Pressable WRAPS the scrim rather than sitting over it as an empty
                  * transparent layer. An empty transparent Pressable is a real RN touch
                  * target but has no pixels of its own, and Detox derives hittability from
                  * a pixel comparison, so tapping it was rejected outright — iOS shard 19
                  * of run 32881947481, messageId 87: "View is not hittable at its visible
                  * point ... 0x11c56b660 is not visible: View does not pass visibility
                  * percent threshold (100)", where 0x11c56b660 was this backdrop. Wrapping
                  * the SVG gives the same touch target the scrim's own pixels, so it is
                  * both pressable by a finger and hittable by Detox.
                  *
                  * No pressed-state style on purpose, unlike the usual Pressable
                  * convention: this is a full-screen scrim, so any feedback would flash the
                  * whole screen. The visible affordance is the highlight and its tooltip.
                  */}
                {itemBounds.endX > 0 &&
                <Pressable
                    onPress={onDismiss}
                    style={StyleSheet.absoluteFill}
                    testID='tutorial_highlight.backdrop'
                >
                    <HighlightItem
                        borderRadius={itemBorderRadius}
                        itemBounds={itemBounds}
                        height={height}
                        onDismiss={onDismiss}
                        width={width}
                        onLayout={handleShowTutorial}
                    />
                </Pressable>
                }
                {itemBounds.endX > 0 && children}
            </View>
        </Modal>
    );
};

export default TutorialHighlight;
