// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, StyleSheet} from 'react-native';
import {CameraOptions} from 'react-native-image-picker';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {fileMaxWarning} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {changeOpacity} from '@utils/theme';

import CameraType from './camera_type';

import type {QuickActionAttachmentProps} from '@typings/components/post_draft_quick_action';

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function CameraQuickAction({
    disabled,
    onUploadFiles,
    maxFilesReached,
    maxFileCount,
    testID,
}: QuickActionAttachmentProps) {
    const intl = useIntl();
    const theme = useTheme();

    const handleButtonPress = useCallback((options: CameraOptions) => {
        const picker = new PickerUtil(intl,
            onUploadFiles);

        picker.attachFileFromCamera(options);
    }, [intl, onUploadFiles]);

    const renderContent = useCallback(() => {
        return (
            <CameraType
                onPress={handleButtonPress}
            />
        );
    }, [handleButtonPress]);

    const openSelectorModal = useCallback(() => {
        if (maxFilesReached) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                fileMaxWarning(intl, maxFileCount),
            );
            return;
        }

        bottomSheet({
            title: intl.formatMessage({id: 'camera_type.title', defaultMessage: 'Choose an action'}),
            renderContent,
            snapPoints: [200, 10],
            theme,
            closeButtonId: 'camera-close-id',
        });
    }, [intl, theme, renderContent, maxFilesReached, maxFileCount]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={openSelectorModal}
            style={style.icon}
            type={'opacity'}
        >
            <CompassIcon
                color={color}
                name='camera-outline'
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}
