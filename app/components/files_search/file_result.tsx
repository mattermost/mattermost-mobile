// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';

import File from '@components/files/file';
import {useIsTablet} from '@hooks/device';
import {getViewPortWidth} from '@utils/images';

import TabletOptions from './file_options/tablet_options';

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
    fileInfo: FileInfo;
    index: number;
    numOptions: number;
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
    numOptions,
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
    const {height} = Dimensions.get('window');

    const handleOptionsPress = useCallback((fInfo: FileInfo) => {
        elementsRef.current?.measureInWindow((x, y) => {
            setOpenUp((y > height / 2));
            setXYoffset({x, y});
            setShowOptions(true);
            onOptionsPress(fInfo);
        });
    }, []);

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
                    optionSelected={isTablet && showOptions}
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
