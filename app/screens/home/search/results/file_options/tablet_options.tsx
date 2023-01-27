// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo} from 'react';
import {Overlay} from 'react-native-elements';

import {ITEM_HEIGHT} from '@components/option_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import OptionMenus from './option_menus';

import type {XyOffset} from '../file_result';
import type {GalleryAction} from '@typings/screens/gallery';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    tablet: {
        backgroundColor: theme.centerChannelBg,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 8,
        borderWidth: 1,
        paddingLeft: 20,
        position: 'absolute',
        right: 20,
        width: 252,
        marginRight: 20,
        shadowColor: theme.centerChannelColor,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.12,
        shadowRadius: 24,
    },
    backDrop: {opacity: 0},
}));

const openDownMargin = 64;

type Props = {
    fileInfo: FileInfo;
    numOptions: number;
    openUp?: boolean;
    setAction: (action: GalleryAction) => void;
    setShowOptions: (show: boolean) => void;
    xyOffset: XyOffset;
}
const TabletOptions = ({
    fileInfo,
    numOptions,
    openUp = false,
    setAction,
    setShowOptions,
    xyOffset,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const toggleOverlay = useCallback(() => {
        setShowOptions(false);
    }, []);

    const overlayStyle = useMemo(() => ({
        marginTop: openUp ? 0 : openDownMargin,
        top: xyOffset?.y ? xyOffset.y - (openUp ? ITEM_HEIGHT * numOptions : 0) : 0,
        right: xyOffset?.x,
    }), [numOptions, openUp, xyOffset]);

    return (
        <Overlay
            backdropStyle={styles.backDrop}
            fullScreen={false}
            isVisible={true}
            onBackdropPress={toggleOverlay}
            overlayStyle={[
                styles.tablet,
                overlayStyle,
            ]}
        >
            <OptionMenus
                setAction={setAction}
                fileInfo={fileInfo}
            />
        </Overlay>
    );
};

export default TabletOptions;
