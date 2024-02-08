// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Modal, useWindowDimensions} from 'react-native';

import HighlightItem from './item';

type Props = {
    children?: React.ReactNode;
    itemBounds: TutorialItemBounds;
    itemBorderRadius?: number;
    onDismiss: () => void;
    onShow?: () => void;
}

const TutorialHighlight = ({children, itemBounds, itemBorderRadius, onDismiss, onShow}: Props) => {
    const {width, height} = useWindowDimensions();

    const handleShowTutorial = useCallback(() => {
        if (onShow) {
            setTimeout(onShow, 1000);
        }
    }, [itemBounds]);

    return (
        <Modal
            visible={itemBounds.endX > 0}
            transparent={true}
            animationType='fade'
            onDismiss={onDismiss}
            onRequestClose={onDismiss}
            testID='tutorial_highlight'
        >
            <HighlightItem
                borderRadius={itemBorderRadius}
                itemBounds={itemBounds}
                height={height}
                onDismiss={onDismiss}
                width={width}
                onLayout={handleShowTutorial}
            />
            {children}
        </Modal>
    );
};

export default TutorialHighlight;
