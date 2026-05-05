// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Modal, View, useWindowDimensions} from 'react-native';

import {useTutorial} from '@context/tutorial';

import HighlightItem from './item';

type Props = {
    children?: React.ReactNode;
    itemRef: React.RefObject<View | null>;
    itemBorderRadius?: number;
    onDismiss: () => void;
    onShow?: () => void;
}

const EMPTY_BOUNDS: TutorialItemBounds = {startX: 0, startY: 0, endX: 0, endY: 0};

const TutorialHighlight = ({children, itemRef, itemBorderRadius, onDismiss, onShow}: Props) => {
    const {width, height} = useWindowDimensions();
    const {rootOffset} = useTutorial();
    const [itemBounds, setItemBounds] = useState<TutorialItemBounds>(EMPTY_BOUNDS);

    const onRootLayout = useCallback(() => {
        itemRef.current?.measureInWindow((x, y, w, h) => {
            setItemBounds({
                startX: x,
                startY: y + rootOffset,
                endX: x + w,
                endY: y + rootOffset + h,
            });
        });
    }, [itemRef, rootOffset]);

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
        >
            <View
                style={{flex: 1}}
                onLayout={onRootLayout}
            >
                <HighlightItem
                    borderRadius={itemBorderRadius}
                    itemBounds={itemBounds}
                    height={height}
                    onDismiss={onDismiss}
                    width={width}
                    onLayout={handleShowTutorial}
                />
                {itemBounds.endX > 0 && children}
            </View>
        </Modal>
    );
};

export default TutorialHighlight;
