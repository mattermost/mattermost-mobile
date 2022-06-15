// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, useWindowDimensions, View} from 'react-native';

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
    const [visible, setIsVisible] = useState(false);
    const isLandscape = width > height;
    const supportedOrientations = isLandscape ? 'landscape' : 'portrait';

    useEffect(() => {
        const t = setTimeout(() => {
            setIsVisible(true);
        }, 500);

        return () => clearTimeout(t);
    }, []);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType='fade'
            onShow={onShow}
            onDismiss={onDismiss}
            onRequestClose={onDismiss}
            supportedOrientations={[supportedOrientations]}
        >
            <View
                style={StyleSheet.absoluteFill}
                pointerEvents='box-none'
            />
            <HighlightItem
                borderRadius={itemBorderRadius}
                itemBounds={itemBounds}
                height={height}
                onDismiss={onDismiss}
                width={width}
            />
            {children}
        </Modal>
    );
};

export default TutorialHighlight;
