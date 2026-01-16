// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import File from '@components/files/file';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import {getViewPortWidth} from '@utils/images';

import Options from './file_options/file_options';

import type {GalleryAction} from '@typings/screens/gallery';

export type XyOffset = {x: number; y: number} | undefined;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 20,
    },
});

type Props = {
    canDownloadFiles: boolean;
    channelName?: string;
    enableSecureFilePreview: boolean;
    publicLinkEnabled: boolean;
    fileInfo: FileInfo;
    index: number;
    onOptionsPress: (finfo: FileInfo) => void;
    onPress: (idx: number) => void;
    setAction: (action: GalleryAction) => void;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
}

const galleryIdentifier = 'search-files-location';

const FileResult = ({
    canDownloadFiles,
    channelName,
    enableSecureFilePreview,
    fileInfo,
    index,
    publicLinkEnabled,
    onOptionsPress,
    onPress,
    setAction,
    updateFileForGallery,
}: Props) => {
    const elementsRef = useRef<View | null>(null);
    const isTablet = useIsTablet();
    const isReplyPost = false;

    const [showOptions, setShowOptions] = useState<boolean>(false);
    const [openUp, setOpenUp] = useState<boolean>(false);
    const [xyOffset, setXYoffset] = useState<XyOffset>(undefined);
    const {height} = useWindowDimensions();

    const handleOptionsPress = useCallback((fInfo: FileInfo) => {
        elementsRef.current?.measureInWindow((x, y, _, h) => {
            const openUpwards = (y > height / 2);
            const offsetY = openUpwards ? (y + (h / 2)) : (y - (h / 2));
            setOpenUp(openUpwards);
            setXYoffset({x, y: offsetY});
            setShowOptions(true);
            onOptionsPress(fInfo);
        });
    }, [height, onOptionsPress]);

    const handleSetAction = useCallback((action: GalleryAction) => {
        setAction(action);
        if (showOptions && action !== 'none') {
            setShowOptions(false);
        }
    }, [setAction, showOptions]);

    return (
        <>
            <View
                ref={elementsRef}
                style={styles.container}
                collapsable={false}
            >
                <File
                    asCard={true}
                    canDownloadFiles={canDownloadFiles}
                    enableSecureFilePreview={enableSecureFilePreview}
                    channelName={channelName}
                    file={fileInfo}
                    galleryIdentifier={galleryIdentifier}
                    inViewPort={true}
                    index={index}
                    nonVisibleImagesCount={0}
                    onOptionsPress={handleOptionsPress}
                    onPress={onPress}
                    optionSelected={showOptions}
                    showDate={true}
                    updateFileForGallery={updateFileForGallery}
                    wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
                />
            </View>
            {showOptions && Boolean(xyOffset) &&
                <Options
                    fileInfo={fileInfo}
                    canDownloadFiles={canDownloadFiles}
                    enableSecureFilePreview={enableSecureFilePreview}
                    publicLinkEnabled={publicLinkEnabled}
                    openUp={openUp}
                    setAction={handleSetAction}
                    setShowOptions={setShowOptions}
                    xyOffset={xyOffset}
                />
            }
        </>
    );
};

export default React.memo(FileResult);
