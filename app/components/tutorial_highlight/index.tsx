// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Modal, StyleSheet, View} from 'react-native';

import HighlightItem from './item';

type Props = {
    children?: React.ReactNode;
    itemBounds: TutorialItemBounds;
    itemBorderRadius?: number;
    onDismiss: () => void;
    onShow: () => void;
}

const TutorialHighlight = ({children, itemBounds, itemBorderRadius, onDismiss, onShow}: Props) => {
    return (
        <Modal
            visible={true}
            transparent={true}
            animationType='fade'
            onShow={onShow}
            onDismiss={onDismiss}
            onRequestClose={onDismiss}
            supportedOrientations={['landscape']}
        >
            <View
                style={StyleSheet.absoluteFill}
                pointerEvents='box-none'
            />
            <HighlightItem
                borderRadius={itemBorderRadius}
                itemBounds={itemBounds}
                onDismiss={onDismiss}
            />
            {children}
        </Modal>
    );
};

export default TutorialHighlight;
