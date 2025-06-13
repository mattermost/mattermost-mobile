// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {openAsBottomSheet} from '@screens/navigation';
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

const POST_PRIORITY_PICKER_BUTTON = 'close-post-priority-picker';

export default function PostPriorityAction({
    testID,
    postPriority,
    updatePostPriority,
}: Props) {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();

    const onPress = useCallback(() => {
        Keyboard.dismiss();

        const title = isTablet ? intl.formatMessage({id: 'post_priority.picker.title', defaultMessage: 'Message priority'}) : '';

        openAsBottomSheet({
            closeButtonId: POST_PRIORITY_PICKER_BUTTON,
            screen: Screens.POST_PRIORITY_PICKER,
            theme,
            title,
            props: {
                postPriority,
                updatePostPriority,
                closeButtonId: POST_PRIORITY_PICKER_BUTTON,
            },
        });
    }, [isTablet, intl, theme, postPriority, updatePostPriority]);

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
