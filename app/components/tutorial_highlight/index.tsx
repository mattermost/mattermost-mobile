// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Modal, StyleSheet, useWindowDimensions, View} from 'react-native';

import HighlightItem from './item';

type Props = {
    children?: React.ReactNode;
    itemBounds: TutorialItemBounds;
    itemBorderRadius?: number;
    onDismiss: () => void;
    onLayout: () => void;
    onShow?: () => void;
}

const TutorialHighlight = ({children, itemBounds, itemBorderRadius, onDismiss, onLayout, onShow}: Props) => {
    const {width, height} = useWindowDimensions();

    const handleShowTutorial = useCallback(() => {
        if (onShow) {
            setTimeout(onShow, 1000);
        }
    }, [itemBounds]);

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
                style={StyleSheet.absoluteFill}
                pointerEvents='box-none'
                onLayout={onLayout}
            />
            {itemBounds.endX > 0 &&
            <HighlightItem
                borderRadius={itemBorderRadius}
                itemBounds={itemBounds}
                height={height}
                onDismiss={onDismiss}
                width={width}
                onLayout={handleShowTutorial}
            />
            }
            {children}
        </Modal>
    );
};

export default TutorialHighlight;
