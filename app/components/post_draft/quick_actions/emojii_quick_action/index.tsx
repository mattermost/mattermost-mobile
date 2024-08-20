// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {ICON_SIZE} from '@app/constants/post_draft';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

type Props = {
    testID?: string;
    disabled?: boolean;
    handleOpenEmojiPicker: () => void;
    isEmojiPickerOpen: boolean;
}

const getStyleSheet = (theme: Theme, isEmojiPickerOpen: boolean) => {
    return makeStyleSheetFromTheme(() => {
        return {
            disabled: {
                tintColor: changeOpacity(theme.centerChannelColor, 0.16),
            },
            icon: {
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
                backgroundColor: isEmojiPickerOpen ? changeOpacity(theme.buttonBg, 0.08) : 'transparent',
                borderRadius: 4,
            },
        };
    })(theme);
};

const EmojiQuickAction: React.FC<Props> = ({
    testID,
    disabled,
    handleOpenEmojiPicker,
    isEmojiPickerOpen,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme, isEmojiPickerOpen);
    const iconColor = isEmojiPickerOpen ? changeOpacity(theme.buttonBg, 1) : changeOpacity(theme.centerChannelColor, 0.64);
    const actionTestID = disabled ? `${testID}.disabled` : testID;

    return (
        <Pressable
            testID={actionTestID}
            style={style.icon}
            onPress={handleOpenEmojiPicker}
        >
            <CompassIcon
                name='emoticon-happy-outline'
                size={ICON_SIZE}
                color={iconColor}
            />
        </Pressable>);
};

export default EmojiQuickAction;
