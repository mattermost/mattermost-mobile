// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, View, StyleSheet, type ListRenderItem} from 'react-native';
import {useIntl} from 'react-intl';

import UserProfileLabel from './label';

type CustomAttribute = {
    id: string;
    label: string;
    value: string;
};

type Props = {
    nickname?: string;
    position?: string;
    localTime?: string;
}

const CustomAttributes = ({nickname, position, localTime}: Props) => {
    const {formatMessage} = useIntl();

    // Combine standard and custom attributes
    const attributes = [
        ...(nickname ? [{
            id: 'nickname',
            label: formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'}),
            value: nickname,
        }] : []),
        ...(position ? [{
            id: 'position',
            label: formatMessage({id: 'channel_info.position', defaultMessage: 'Position'}),
            value: position,
        }] : []),
        ...(localTime ? [{
            id: 'local_time',
            label: formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'}),
            value: localTime,
        }] : []),
        // Mock custom attributes - in real implementation these would come from the user model
        ...Array.from({length: 15}, (_, i) => ({
            id: `attr_${i}`,
            label: `Custom Field ${i + 1}`,
            value: `Value ${i + 1}`,
        })),
    ];
    const renderAttribute: ListRenderItem<CustomAttribute> = ({item}) => (
        <UserProfileLabel
            title={item.label}
            description={item.value}
            testID={`custom_attribute.${item.id}`}
        />
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={MOCK_CUSTOM_ATTRIBUTES}
                renderItem={renderAttribute}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={10}
                windowSize={5}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
    },
});

export default CustomAttributes;
