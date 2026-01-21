// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {dismissKeyboard} from '@utils/keyboard';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    postPriority: PostPriority;
    updatePostPriority: (postPriority: PostPriority) => void;
}

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function PostPriorityAction({
    testID,
    postPriority,
    updatePostPriority,
}: Props) {
    const theme = useTheme();
    const {closeInputAccessoryView} = useKeyboardAnimationContext();

    const onPress = useCallback(async () => {
        closeInputAccessoryView();
        await dismissKeyboard();
        CallbackStore.setCallback(updatePostPriority);
        navigateToScreen(Screens.POST_PRIORITY_PICKER, {
            postPriority,
        });
    }, [closeInputAccessoryView, postPriority, updatePostPriority]);

    const iconName = 'alert-circle-outline';
    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={testID}
            onPress={onPress}
            style={style.icon}
            type={'opacity'}
        >
            <CompassIcon
                name={iconName}
                color={iconColor}
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}
