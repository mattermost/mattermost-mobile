// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useShareExtensionState} from '@share/state';

type Props = {
    theme: Theme;
}

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};

const styles = StyleSheet.create({
    left: {
        marginLeft: 10,
    },
});

const CloseHeaderButton = ({theme}: Props) => {
    const {closeExtension} = useShareExtensionState();
    const onPress = useCallback(() => {
        closeExtension(null);
    }, [closeExtension]);

    return (
        <TouchableOpacity
            onPress={onPress}
            hitSlop={hitSlop}
        >
            <View style={styles.left}>
                <CompassIcon
                    name='close'
                    color={theme.sidebarHeaderTextColor}
                    size={24}
                />
            </View>
        </TouchableOpacity>
    );
};

export default CloseHeaderButton;
