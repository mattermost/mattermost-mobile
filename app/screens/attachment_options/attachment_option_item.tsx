// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, Text} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {ICON_SIZE} from '@app/constants/post_draft';

type Props = {
    iconName: string;
    title: string;
    onPress: () => void;
}

const AttachmentOptionItem: React.FC<Props> = ({iconName, title, onPress}) => {
    return (
        <Pressable onPress={onPress}>
            <CompassIcon
                name={iconName}
                size={ICON_SIZE}
            />
            <Text>{title}</Text>
        </Pressable>);
};

export default AttachmentOptionItem;
