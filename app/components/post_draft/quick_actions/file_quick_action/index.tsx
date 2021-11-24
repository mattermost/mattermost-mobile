// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import PickerUtil from '@utils/file/file_picker/file_picker';
import {changeOpacity} from '@utils/theme';

import type {QuickActionAttachmentProps} from '@typings/components/post_draft_quick_action';

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function FileQuickAction({
    disabled,
    onUploadFiles,
    testID = '',
}: QuickActionAttachmentProps) {
    const intl = useIntl();
    const theme = useTheme();

    const handleButtonPress = useCallback(() => {
        const picker = new PickerUtil(intl,
            onUploadFiles);

        picker.attachFileFromFiles();
    }, [onUploadFiles]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={handleButtonPress}
            style={style.icon}
            type={'opacity'}
        >
            <CompassIcon
                color={color}
                name='file-document-outline'
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}

