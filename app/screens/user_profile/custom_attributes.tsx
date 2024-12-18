import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

// Mock custom attributes - in real implementation these would come from the user model
const MOCK_CUSTOM_ATTRIBUTES = [
    { id: 'dept', label: 'Department', value: 'Engineering' },
    { id: 'loc', label: 'Location', value: 'San Francisco' },
    { id: 'emp', label: 'Employee ID', value: 'EMP123' },
];

const CustomAttributes = () => {
    return (
        <View style={styles.container}>
            {MOCK_CUSTOM_ATTRIBUTES.map((attr) => (
                <View key={attr.id} style={styles.attributeContainer}>
                    <Text style={styles.label}>{attr.label}</Text>
                    <Text style={styles.value}>{attr.value}</Text>
                </View>
            ))}
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
