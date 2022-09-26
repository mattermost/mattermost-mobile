// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import PostPriorityPicker from '@components/post_priority/post_priority_picker';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {PostPriorityTypes} from '@constants/post';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    postPriority: PostPriorityTypes;
    updatePostPriority: (priority: PostPriorityTypes) => void;
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
    const theme = useTheme();

    const handlePostPriority = useCallback((value: PostPriorityTypes) => {
        updatePostPriority(value);
        dismissBottomSheet();
    }, []);

    const renderContent = useCallback(() => {
        return (
            <PostPriorityPicker
                postPriority={postPriority}
                updatePostPriority={handlePostPriority}
            />
        );
    }, [postPriority]);

    const onPress = useCallback(() => {
        bottomSheet({
            title: intl.formatMessage({id: 'post_priority.picker.title', defaultMessage: 'Message priority'}),
            renderContent,
            snapPoints: [275, 10],
            theme,
            closeButtonId: 'post-priority-close-id',
        });
    }, [intl, renderContent]);

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
