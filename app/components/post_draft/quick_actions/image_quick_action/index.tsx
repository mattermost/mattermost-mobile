// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text} from 'react-native';

import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {fileMaxWarning} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {QuickActionAttachmentProps} from '@typings/components/post_draft_quick_action';

const getStyle = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },

}));

export default function ImageQuickAction({
    disabled,
    fileCount = 0,
    onUploadFiles,
    maxFilesReached,
    maxFileCount,
    testID = '',
}: QuickActionAttachmentProps) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyle(theme);

    const handleButtonPress = useCallback(() => {
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

        const picker = new PickerUtil(intl,
            onUploadFiles);

        picker.attachFileFromPhotoGallery(maxFileCount - fileCount);
    }, [maxFilesReached, intl, onUploadFiles, maxFileCount, fileCount]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={handleButtonPress}
            type={'opacity'}
            style={style.container}
        >
            <CompassIcon
                color={color}
                name='image-outline'
                size={ICON_SIZE}
            />
            <Text style={style.title}>
                {intl.formatMessage({id: 'attachment_options.image_attachment.title', defaultMessage: 'Choose from photo library'})}
            </Text>
        </TouchableWithFeedback>
    );
}

