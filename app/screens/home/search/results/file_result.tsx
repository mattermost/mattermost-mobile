// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import File from '@components/files/file';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {GalleryAction} from '@typings/screens/gallery';
import {getViewPortWidth} from '@utils/images';

import {useNumberItems} from './file_options/hooks';
import {showMobileOptionsBottomSheet} from './file_options/mobile_options';
import TabletOptions from './file_options/tablet_options';
import Toasts from './file_options/toasts';

export type XyOffset = {x: number; y: number} | undefined;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 20,
    },
});

type Props = {
    canDownloadFiles: boolean;
    channelName: string | undefined;
    fileInfo: FileInfo;
    index: number;
    isSingleImage: boolean;
    onPress: (idx: number) => void;
    publicLinkEnabled: boolean;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
}

const galleryIdentifier = 'search-files-location';

const FileResult = ({
    canDownloadFiles,
    channelName,
    fileInfo,
    index,
    isSingleImage,
    onPress,
    publicLinkEnabled,
    updateFileForGallery,
}: Props) => {
    const elementsRef = useRef<View | null>(null);
    const theme = useTheme();
    const isTablet = useIsTablet();
    const isReplyPost = false;
    const insets = useSafeAreaInsets();
    const numOptions = useNumberItems(canDownloadFiles, publicLinkEnabled);

    const [lastViewedFileInfo, setLastViewedFileInfo] = useState<FileInfo | undefined>(undefined);
    const [action, setAction] = useState<GalleryAction>('none');

    const [showOptions, setShowOptions] = useState<boolean>(false);
    const [openUp, setOpenUp] = useState<boolean>(false);
    const [xyOffset, setXYoffset] = useState<XyOffset>(undefined);
    const {height} = Dimensions.get('window');

    const fileRef = useCallback((element: View) => {
        if (showOptions) {
            elementsRef.current = element;
            elementsRef?.current?.measureInWindow((x, y) => {
                setOpenUp((y > height / 2));
                setXYoffset({x, y});
            });
        }
    }, [elementsRef, showOptions]);

    useEffect(() => {
        console.log('action', action);
        if (showOptions && action === 'none') {
            setShowOptions(false);
        }
    }, [action]);

    const handleOpenOptions = useCallback((fInfo: FileInfo) => {
        setShowOptions(!showOptions);
        setLastViewedFileInfo(fInfo);

        if (!isTablet) {
            showMobileOptionsBottomSheet({
                action,
                setAction,
                fileInfo,
                insets,
                numOptions,
                theme,
            });
        }
    }, [isTablet, numOptions, showOptions, theme]);

    // This effect handles the case where a user has the FileOptions Modal
    // open and the server changes the ability to download files or copy public
    // links. Reopen the Bottom Sheet again so the new options are added or
    // removed.
    useEffect(() => {
        if (lastViewedFileInfo === undefined) {
            return;
        }
        if (NavigationStore.getNavigationTopComponentId() === Screens.BOTTOM_SHEET) {
            dismissBottomSheet().then(() => {
                handleOpenOptions(lastViewedFileInfo);
            });
        }
    }, [canDownloadFiles, publicLinkEnabled, lastViewedFileInfo]);

    return (
        <>
            <View
                ref={fileRef}
                style={styles.container}
            >
                <File
                    asCard={true}
                    canDownloadFiles={canDownloadFiles}
                    channelName={channelName}
                    file={fileInfo}
                    galleryIdentifier={galleryIdentifier}
                    inViewPort={true}
                    index={index}
                    isSingleImage={isSingleImage}
                    nonVisibleImagesCount={0}
                    onOptionsPress={handleOpenOptions}
                    onPress={onPress}
                    optionSelected={showOptions}
                    publicLinkEnabled={publicLinkEnabled}
                    showDate={true}
                    updateFileForGallery={updateFileForGallery}
                    wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
                />
            </View>
            <Toasts
                action={action}
                fileInfo={lastViewedFileInfo}
                setAction={setAction}
            />
            {isTablet && showOptions && xyOffset &&
                <TabletOptions
                    action={action}
                    canDownloadFiles={canDownloadFiles}
                    fileInfo={fileInfo}
                    optionSelected={showOptions}
                    setShowOptions={setShowOptions}
                    openUp={openUp}
                    publicLinkEnabled={publicLinkEnabled}
                    setAction={setAction}
                    xyOffset={xyOffset}
                />
            }
        </>
    );
};

export default FileResult;
