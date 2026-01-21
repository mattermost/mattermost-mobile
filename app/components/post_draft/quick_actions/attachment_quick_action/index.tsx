// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {dismissKeyboard} from '@utils/keyboard';
import {openAttachmentOptions} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {QuickActionAttachmentProps} from '@typings/components/post_draft_quick_action';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        iconContainer: {
            display: 'flex',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 20,
            alignItems: 'center',
            alignSelf: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            marginRight: 8,
        },
        icon: {
            alignSelf: 'center',
        },
    };
});

export default function AttachmentQuickAction({
    disabled,
    fileCount = 0,
    onUploadFiles,
    maxFilesReached,
    maxFileCount,
    testID = '',
}: QuickActionAttachmentProps) {
    const theme = useTheme();
    const {closeInputAccessoryView} = useKeyboardAnimationContext();
    const style = getStyleSheet(theme);
    const iconColor = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    const openFileAttachmentOptions = useCallback(async () => {
        closeInputAccessoryView();
        await dismissKeyboard();

        openAttachmentOptions({
            onUploadFiles,
            maxFilesReached,
            canUploadFiles: !disabled,
            testID,
            fileCount,
            maxFileCount,
        });
    }, [closeInputAccessoryView, onUploadFiles, maxFilesReached, disabled, testID, fileCount, maxFileCount]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={openFileAttachmentOptions}
            style={style.iconContainer}
            type={'opacity'}
        >
            <CompassIcon
                name='plus'
                size={ICON_SIZE}
                color={iconColor}
                style={style.icon}
            />
        </TouchableWithFeedback>
    );
}

