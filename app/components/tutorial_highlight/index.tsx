// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Modal, Platform, StatusBar, View, useWindowDimensions} from 'react-native';

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
            >
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
                {itemBounds.endX > 0 && children}
            </View>
        </Modal>
    );
};

export default TutorialHighlight;
