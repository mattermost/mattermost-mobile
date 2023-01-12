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
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {POST_PRIORITY_PICKER_BUTTON} from '@screens/post_priority_picker';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    postPriority: PostPriorityMetadata;
    updatePostPriority: (postPriority: PostPriorityMetadata) => void;
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
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();

    const onPress = useCallback(() => {
        Keyboard.dismiss();
        const passProps = {
            postPriority,
            updatePostPriority,
        };
        const title = isTablet ? intl.formatMessage({id: 'post_priority.picker.title', defaultMessage: 'Message priority'}) : '';

        if (isTablet) {
            showModal(Screens.POST_PRIORITY_PICKER, title, passProps, bottomSheetModalOptions(theme, POST_PRIORITY_PICKER_BUTTON));
        } else {
            showModalOverCurrentContext(Screens.POST_PRIORITY_PICKER, passProps, bottomSheetModalOptions(theme));
        }
    }, [intl, postPriority, updatePostPriority, theme]);

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
