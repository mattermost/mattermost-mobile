// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import BottomSheet from '@screens/bottom_sheet';

import AttachmentOptionContainer from './attachment_option_container';

import type {AttachmentOptionsProps} from '@app/components/post_draft/quick_actions/attachment_options/attachment_options.types';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    closeButtonId: string;
} & AttachmentOptionsProps;

const style = StyleSheet.create({
    contentStyle: {
        paddingTop: 14,
    },
});

const AttachmentOptionsScreen: React.FC<Props> = ({
    componentId,
    closeButtonId,
    canUploadFiles,
    fileCount,
    maxFileCount,
    onUploadFiles,
    maxFilesReached,
    testID,
}) => {
    const renderComponent = () => {
        return (
            <AttachmentOptionContainer
                onUploadFiles={onUploadFiles}
                canUploadFiles={canUploadFiles}
                fileCount={fileCount}
                maxFileCount={maxFileCount}
                testID={testID}
                maxFilesReached={maxFilesReached}
            />);
    };

    return (
        <BottomSheet
            renderContent={renderComponent}
            closeButtonId={closeButtonId}
            componentId={componentId}
            contentStyle={style.contentStyle}
            initialSnapIndex={1}
            testID='quick_actions'
            snapPoints={['20%', '40%']}
        />);
};

export default AttachmentOptionsScreen;
