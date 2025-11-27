// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {usePreventDoubleTap} from '@hooks/utils';
import {useShareExtensionSubmit} from '@share/hooks/use_share_extension_submit';
import {changeOpacity} from '@utils/theme';

type Props = {
    theme: Theme;
}

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};

const styles = StyleSheet.create({
    right: {
        marginRight: 10,
    },
});

const PostButton = ({theme}: Props) => {
    const {submit, disabled} = useShareExtensionSubmit();
    const onPress = usePreventDoubleTap(submit);

    return (
        <TouchableOpacity
            disabled={disabled}
            onPress={onPress}
            hitSlop={hitSlop}
        >
            <View style={[styles.right]}>
                <CompassIcon
                    name='send'
                    color={changeOpacity(theme.sidebarHeaderTextColor, disabled ? 0.16 : 1)}
                    size={24}
                />
            </View>
        </TouchableOpacity>
    );
};

export default PostButton;
