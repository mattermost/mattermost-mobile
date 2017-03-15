// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Font from 'react-native-vector-icons/FontAwesome';

export default class OptionsModalList extends PureComponent {
    static propTypes = {
        items: PropTypes.array.isRequired,
        onCancelPress: PropTypes.func
    }

    renderOptions = () => {
        const {items, onCancelPress} = this.props;

        const options = items.map((item, index) => {
            return (
                <TouchableOpacity
                    key={index}
                    onPress={item.action}
                    style={[style.option, style.optionBorder]}
                >
                    <Text style={[style.optionText, item.textStyle]}>{item.text}</Text>
                    {item.icon &&
                        <Font
                            name={item.icon}
                            size={18}
                            style={style.optionIcon}
                        />
                    }
                </TouchableOpacity>
            );
        });

        const cancel = (
            <TouchableOpacity
                key={items.length}
                onPress={onCancelPress}
                style={style.option}
            >
                <Text style={style.optionText}>{'Cancel'}</Text>
            </TouchableOpacity>
        );

        return [
            ...options,
            cancel
        ];
    }

    render() {
        return (
            <View style={style.wrapper}>
                <View style={style.optionContainer}>
                    {this.renderOptions()}
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    option: {
        alignSelf: 'stretch',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)'
    },
    optionContainer: {
        alignSelf: 'stretch',
        backgroundColor: 'white',
        borderRadius: 2,
        marginHorizontal: 30
    },
    optionIcon: {
        color: '#7f8180'
    },
    optionText: {
        color: '#000',
        flex: 1,
        fontSize: 16
    },
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    }
});
