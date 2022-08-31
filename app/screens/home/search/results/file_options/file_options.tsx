// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Overlay} from 'react-native-elements';

import {showPermalink} from '@actions/remote/permalink';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import CopyPublicLink from '@screens/gallery/footer/copy_public_link';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Header from './header';

import type {GalleryAction, GalleryItemType} from '@typings/screens/gallery';

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
    toast: {
        marginTop: 100,
        alignItems: 'center',
    },
}));

const openDownMargin = 64;

type Props = {
    canDownloadFiles?: boolean;
    enablePublicLink?: boolean;
    fileInfo: FileInfo;
    setSelectedItemNumber?: (index: number | undefined) => void;
    openUp?: boolean;
    xOffset?: number;
    yOffset?: number;
    setIsOpen?: (open: boolean) => void;
}
const FileOptions = ({
    fileInfo,
    canDownloadFiles,
    enablePublicLink,
    setSelectedItemNumber,
    xOffset,
    yOffset,
    openUp = false,
    setIsOpen,
}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();

    const theme = useTheme();
    const [numItems, setNumItems] = useState(0);
    const serverUrl = useServerUrl();
    const [action, setAction] = useState<GalleryAction>('none');
    const styles = getStyleSheet(theme);
    const [visible, setVisible] = useState(true);

    const galleryItem = {...fileInfo, type: 'image'} as GalleryItemType;

    const handleDownload = useCallback(() => {
        setAction('downloading');
        setSelectedItemNumber?.(undefined);
    }, []);

    const handleCopyLink = useCallback(() => {
        setAction('copying');
        setSelectedItemNumber?.(undefined);
    }, []);

    const handlePermalink = useCallback(() => {
        showPermalink(serverUrl, '', fileInfo.post_id, intl);
        setSelectedItemNumber?.(undefined);
    }, [serverUrl, fileInfo.post_id, intl]);

    const optionItems = useMemo(() => {
        const items = [];
        if (canDownloadFiles) {
            items.push(
                <OptionItem
                    key={'download'}
                    action={handleDownload}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.download', defaultMessage: 'Download'})}
                    icon={'download-outline'}
                    type='default'
                />,
            );
        }
        items.push(
            <OptionItem
                key={'permalink'}
                action={handlePermalink}
                label={intl.formatMessage({id: 'screen.search.results.file_options.open_in_channel', defaultMessage: 'Open in channel'})}
                icon={'globe'}
                type='default'
            />,
        );
        if (enablePublicLink) {
            items.push(
                <OptionItem
                    key={'link'}
                    action={handleCopyLink}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.copy_link', defaultMessage: 'Copy link'})}
                    icon={'link-variant'}
                    type='default'
                />,
            );
        }
        setNumItems(items.length);
        return items.flat();
    }, [canDownloadFiles, enablePublicLink, handlePermalink, handleDownload, handleCopyLink]);

    const toggleOverlay = useCallback(() => {
        setVisible(!visible);
        setIsOpen?.(false);
        setSelectedItemNumber?.(undefined);
    }, [visible]);

    const overlayStyle = useMemo(() => ({
        top: yOffset ? yOffset - (openUp ? ITEM_HEIGHT * numItems : 0) : 0,
        marginTop: openUp ? 0 : openDownMargin,
        right: xOffset,
    }), [xOffset, yOffset, numItems]);

    const tablet = useMemo(() => {
        return (
            <Overlay
                isVisible={visible}
                onBackdropPress={toggleOverlay}
                backdropStyle={styles.backDrop}
                fullScreen={false}
                overlayStyle={[
                    styles.tablet,
                    overlayStyle,
                ]}
            >
                {optionItems}
            </Overlay>
        );
    }, [optionItems, openUp, overlayStyle, styles]);

    const mobile = useMemo(() => {
        return (
            <>
                <Header fileInfo={fileInfo}/>
                {optionItems}
                <View style={styles.toast} >
                    {action === 'downloading' &&
                    <DownloadWithAction
                        action={action}
                        item={galleryItem}
                        setAction={setAction}
                    />
                    }
                    {action === 'copying' &&
                    <CopyPublicLink
                        item={galleryItem}
                        setAction={setAction}
                    />
                    }
                </View>
            </>
        );
    }, [fileInfo, optionItems]);

    return isTablet ? tablet : mobile;
};

export default FileOptions;
