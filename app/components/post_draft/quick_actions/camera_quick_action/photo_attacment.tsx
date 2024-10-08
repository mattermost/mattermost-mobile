// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import TouchableWithFeedback from '@app/components/touchable_with_feedback';
import {ICON_SIZE} from '@app/constants/post_draft';
import {useTheme} from '@app/context/theme';
import {dismissBottomSheet} from '@app/screens/navigation';
import FilePickerUtil from '@app/utils/file/file_picker';
import {preventDoubleTap} from '@app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

import type {QuickActionAttachmentProps} from '@typings/components/post_draft_quick_action';
import type {CameraOptions} from 'react-native-image-picker';

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

const PhotoAttachment: React.FC<QuickActionAttachmentProps> = ({
    disabled,
    onUploadFiles,
    maxFilesReached,
    testID,
}) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyle(theme);

    const onPress = useCallback(preventDoubleTap(async () => {
        await dismissBottomSheet();
        const picker = new FilePickerUtil(intl, onUploadFiles);
        const options: CameraOptions = {
            quality: 0.8,
            mediaType: 'photo',
            saveToPhotos: true,
        };
        picker.attachFileFromCamera(options);
    }, 500), [intl, onUploadFiles]);

    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled || maxFilesReached}
            onPress={onPress}
            style={style.container}
            type={'opacity'}
        >
            <CompassIcon
                color={color}
                name='camera-outline'
                size={ICON_SIZE}
            />
            <Text style={style.title}>
                {intl.formatMessage({id: 'attachment_options.live_photo.title', defaultMessage: 'Take a photo'})}
            </Text>
        </TouchableWithFeedback>);
};

export default PhotoAttachment;
