// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import {View, Text, TouchableWithoutFeedback, StyleSheet} from 'react-native';
import {Icon} from 'react-native-elements';
import PropTypes from 'prop-types';

export default class PickListItem extends PureComponent {
    static propTypes = {
        index: PropTypes.number.isRequired,
        selected: PropTypes.bool,
        selectedId: PropTypes.number,
        onSelect: PropTypes.func.isRequired,
        onDelete: PropTypes.func.isRequired,
        item: PropTypes.string.isRequired,

    };
    render() {
        const {
            index,
            selected,
            selectedId,
            onSelect,
            item,
            onDelete,
        } = this.props;
        return (
            <View
                key={index}
                style={styles.mainContainer}
            >
                <TouchableWithoutFeedback
                    onPress={() => {
                        onSelect(item, index);
                    }}
                >
                    <View style={styles.contentContainer}>
                        <Text
                            style={{fontSize: 16}}
                            numberOfLines={1}
                        >
                            {item}
                        </Text>
                        {selected && selectedId === index && (
                            <Icon
                                name='check'
                                type='feather'
                                color='#166DE0'
                                size={20}
                                containerStyle={styles.checkContainer}
                            />
                        )}
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                    onPress={() => {
                        onDelete(item);
                    }}
                >
                    <Icon
                        name='x'
                        type='feather'
                        color='rgba(0, 0, 0, 0.20)'
                        size={20}
                        containerStyle={styles.cancelCOntainer}
                    />
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    mainContainer: {
        width: '100%',
        flexDirection: 'row',
        padding: 5,
        justifyContent: 'space-between',
    },
    contentContainer: {
        flexDirection: 'row',
        width: '75%',
        alignItems: 'center',
    },
    checkContainer: {
        marginHorizontal: 5,
        justifyContent: 'center',
    },
    cancelCOntainer: {
        marginHorizontal: 5,
        justifyContent: 'center',
    },
});
