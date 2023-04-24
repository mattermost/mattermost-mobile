// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, StyleSheet, Text, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {PostPriorityColors, PostPriorityType} from '@constants/post';
import {typography} from '@utils/typography';

const style = StyleSheet.create({
    container: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        borderRadius: 4,
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    urgent: {
        backgroundColor: PostPriorityColors.URGENT,
    },
    important: {
        backgroundColor: PostPriorityColors.IMPORTANT,
    },
    label: {
        color: '#fff',
        ...typography('Body', 25, 'SemiBold'),
    },
    icon: {
        color: '#fff',
        fontSize: 12,
        marginRight: 4,
    },
});

type Props = {
    label: PostPriority['priority'];
};

const PostPriorityLabel = ({label}: Props) => {
    const intl = useIntl();

    const containerStyle: StyleProp<ViewStyle> = [style.container];
    let iconName = '';
    let labelText = '';
    if (label === PostPriorityType.URGENT) {
        containerStyle.push(style.urgent);
        iconName = 'alert-outline';
        labelText = intl.formatMessage({id: 'post_priority.label.urgent', defaultMessage: 'URGENT'});
    } else if (label === PostPriorityType.IMPORTANT) {
        containerStyle.push(style.important);
        iconName = 'alert-circle-outline';
        labelText = intl.formatMessage({id: 'post_priority.label.important', defaultMessage: 'IMPORTANT'});
    }
    return (
        <View style={containerStyle}>
            <CompassIcon
                name={iconName}
                style={style.icon}
            />
            <Text style={style.label}>{labelText}</Text>
        </View>
    );
};

export default PostPriorityLabel;
