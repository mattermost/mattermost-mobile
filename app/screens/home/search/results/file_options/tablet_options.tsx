// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo, useState} from 'react';
import {Overlay} from 'react-native-elements';

import {ITEM_HEIGHT} from '@components/option_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import OptionMenus from './option_menus';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    tablet: {
        backgroundColor: theme.centerChannelBg,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 8,
        borderWidth: 1,
        paddingLeft: 20,
        position: 'absolute',
        right: 20,
        width: 252,
        marginRight: 20,
    },
    backDrop: {opacity: 0},
}));

const openDownMargin = 64;

type Props = {
    canDownloadFiles?: boolean;
    handleCopyLink: () => void;
    handleDownload: () => void;
    handlePermalink: () => void;
    numOptions: number;
    openUp?: boolean;
    optionSelected?: boolean;
    publicLinkEnabled?: boolean;
    setIsOpen?: (open: boolean) => void;
    setSelectedItemNumber?: (index: number | undefined) => void;
    xOffset?: number;
    yOffset?: number;
}
const TabletOptions = ({
    canDownloadFiles,
    handleCopyLink,
    handleDownload,
    handlePermalink,
    numOptions,
    openUp = false,
    optionSelected,
    publicLinkEnabled,
    setIsOpen,
    setSelectedItemNumber,
    xOffset,
    yOffset,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [visible, setVisible] = useState(optionSelected);

    const toggleOverlay = useCallback(() => {
        setVisible(!visible);
        setSelectedItemNumber?.(undefined);
        setIsOpen?.(false);
    }, [setIsOpen, setSelectedItemNumber, visible]);

    const overlayStyle = useMemo(() => ({
        marginTop: openUp ? 0 : openDownMargin,
        top: yOffset ? yOffset - (openUp ? ITEM_HEIGHT * numOptions : 0) : 0,
        right: xOffset,
    }), [numOptions, openUp, xOffset, yOffset]);

    return (
        <>
            <Overlay
                backdropStyle={styles.backDrop}
                fullScreen={false}
                isVisible={visible || false}
                onBackdropPress={toggleOverlay}
                overlayStyle={[
                    styles.tablet,
                    overlayStyle,
                ]}
            >
                <OptionMenus
                    canDownloadFiles={canDownloadFiles}
                    enablePublicLink={publicLinkEnabled}
                    handleCopyLink={handleCopyLink}
                    handleDownload={handleDownload}
                    handlePermalink={handlePermalink}
                />
            </Overlay>
        </>
    );
};

export default TabletOptions;
