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
    fileInfo: FileInfo;
    index: number;
    numOptions: number;
    onOptionsPress: (finfo: FileInfo) => void;
    onPress: (idx: number) => void;
    publicLinkEnabled: boolean;
    setAction: (action: GalleryAction) => void;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
}

const galleryIdentifier = 'search-files-location';

const FileResult = ({
    canDownloadFiles,
    channelName,
    fileInfo,
    index,
    numOptions,
    onOptionsPress,
    onPress,
    publicLinkEnabled,
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

    const fileRef = useCallback((element: View) => {
        if (showOptions) {
            elementsRef.current = element;
            elementsRef?.current?.measureInWindow((x, y) => {
                setOpenUp((y > height / 2));
                setXYoffset({x, y});
            });
        }
    }, [elementsRef, showOptions]);

    const handleOptionsPress = useCallback((fInfo: FileInfo) => {
        setShowOptions(true);
        onOptionsPress(fInfo);
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
                    nonVisibleImagesCount={0}
                    onOptionsPress={handleOptionsPress}
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
