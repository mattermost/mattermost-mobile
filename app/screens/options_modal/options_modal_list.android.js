// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import IconFont from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {preventDoubleTap} from 'app/utils/tap';

export default class OptionsModalList extends PureComponent {
    static propTypes = {
        items: PropTypes.array.isRequired,
        onCancelPress: PropTypes.func,
    };

    handleCancelPress = preventDoubleTap(() => {
        if (this.props.onCancelPress) {
            this.props.onCancelPress();
        }
    });

    renderOptions = () => {
        const {items} = this.props;

        const options = items.map((item, index) => {
            let textComponent;
            if (item.text.hasOwnProperty('id')) {
                textComponent = (
                    <FormattedText
                        style={[style.optionText, item.textStyle]}
                        {...item.text}
                    />
                );
            } else {
                textComponent = <Text style={[style.optionText, item.textStyle]}>{item.text}</Text>;
            }

            return (
                <TouchableOpacity
                    key={index}
                    onPress={preventDoubleTap(item.action)}
                    style={[style.option, style.optionBorder]}
                >
                    {textComponent}
                    {item.icon &&
                        <IconFont
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
                onPress={this.handleCancelPress}
                style={style.option}
            >
                <FormattedText
                    id='channel_modal.cancel'
                    defaultMessage='Cancel'
                    style={style.optionText}
                />
            </TouchableOpacity>
        );

        return [
            ...options,
            cancel,
        ];
    };

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
        padding: 15,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    optionContainer: {
        alignSelf: 'stretch',
        backgroundColor: 'white',
        borderRadius: 2,
        marginHorizontal: 30,
    },
    optionIcon: {
        color: '#7f8180',
    },
    optionText: {
        color: '#000',
        flex: 1,
        fontSize: 16,
    },
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
