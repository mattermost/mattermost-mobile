// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, View, Text, StyleSheet, type ListRenderItem} from 'react-native';

type CustomAttribute = {
    id: string;
    label: string;
    value: string;
};

// Mock custom attributes - in real implementation these would come from the user model
const MOCK_CUSTOM_ATTRIBUTES: CustomAttribute[] = Array.from({length: 15}, (_, i) => ({
    id: `attr_${i}`,
    label: `Custom Field ${i + 1}`,
    value: `Value ${i + 1}`,
}));

const CustomAttributes = () => {
    const renderAttribute: ListRenderItem<CustomAttribute> = ({item}) => (
        <View style={styles.attributeContainer}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
        </View>
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
        paddingHorizontal: 20,
    },
    attributeContainer: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        color: '#3f4350',
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
        color: '#1c58d9',
    },
});

export default CustomAttributes;
