// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import File from '@components/files/file';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {GalleryAction} from '@typings/screens/gallery';
import {getViewPortWidth} from '@utils/images';

import {useNumberItems} from './file_options/hooks';
import {showMobileOptionsBottomSheet} from './file_options/mobile_options';
import TabletOptions from './file_options/tablet_options';

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
    setAction: (action: GalleryAction) => void;
    setLastViewedFileInfo: (fInfo: FileInfo) => void;
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
    setAction,
    setLastViewedFileInfo,
    updateFileForGallery,
}: Props) => {
    const elementsRef = useRef<View | null>(null);
    const theme = useTheme();
    const isTablet = useIsTablet();
    const isReplyPost = false;
    const insets = useSafeAreaInsets();
    const numOptions = useNumberItems(canDownloadFiles, publicLinkEnabled);

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

    const handleSetAction = useCallback((a: GalleryAction) => {
        setAction(a);
        if (showOptions && a !== 'none') {
            setShowOptions(false);
        }
    }, [setAction, showOptions]);

    const handleOpenOptions = useCallback(() => {
        setShowOptions(true);
        setLastViewedFileInfo(fileInfo);

        if (!isTablet) {
            showMobileOptionsBottomSheet({
                fileInfo,
                insets,
                numOptions,
                setAction: handleSetAction,
                theme,
            });
        }
    }, [isTablet, numOptions, showOptions, theme]);

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
                    optionSelected={isTablet && showOptions}
                    publicLinkEnabled={publicLinkEnabled}
                    showDate={true}
                    updateFileForGallery={updateFileForGallery}
                    wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
                />
            </View>
            {isTablet && showOptions && xyOffset &&
                <TabletOptions
                    fileInfo={fileInfo}
                    numOptions={numOptions}
                    openUp={openUp}
                    setAction={handleSetAction}
                    setShowOptions={setShowOptions}
                    xyOffset={xyOffset}
                />
            }
        </>
    );
};

export default FileResult;
