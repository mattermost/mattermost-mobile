// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import PostPriorityPicker, {COMPONENT_HEIGHT} from '@components/post_priority/post_priority_picker';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    postPriority: PostPriorityData;
    updatePostPriority: (postPriority: PostPriorityData) => void;
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
    const {bottom} = useSafeAreaInsets();

    const handlePostPriorityPicker = useCallback((postPriorityData: PostPriorityData) => {
        updatePostPriority(postPriorityData);
        dismissBottomSheet();
    }, [updatePostPriority]);

    const renderContent = useCallback(() => {
        return (
            <PostPriorityPicker
                data={{
                    priority: postPriority?.priority || '',
                }}
                onSubmit={handlePostPriorityPicker}
            />
        );
    }, [handlePostPriorityPicker, postPriority]);

    const onPress = useCallback(() => {
        bottomSheet({
            title: intl.formatMessage({id: 'post_priority.picker.title', defaultMessage: 'Message priority'}),
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(1, COMPONENT_HEIGHT, bottom)],
            theme,
            closeButtonId: 'post-priority-close-id',
        });
    }, [intl, renderContent, theme, bottom]);

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
