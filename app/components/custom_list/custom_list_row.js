// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import ConditionalTouchable from 'app/components/conditional_touchable';
import CustomPropTypes from 'app/constants/custom_prop_types';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class CustomListRow extends React.PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        enabled: PropTypes.bool,
        selectable: PropTypes.bool,
        selected: PropTypes.bool,
        children: CustomPropTypes.Children,
    };

    static defaultProps = {
        enabled: true,
    };

    render() {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <ConditionalTouchable
                touchable={Boolean(this.props.enabled && this.props.onPress)}
                onPress={this.props.onPress}
            >
                <View style={style.container}>
                    {this.props.selectable &&
                        <View style={style.selectorContainer}>
                            <View style={[style.selector, (this.props.selected && style.selectorFilled), (!this.props.enabled && style.selectorDisabled)]}>
                                {this.props.selected &&
                                    <Icon
                                        name='check'
                                        size={16}
                                        color='#fff'
                                    />
                                }
                            </View>
                        </View>
                    }
                    {this.props.children}
                </View>
            </ConditionalTouchable>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            height: 65,
            paddingHorizontal: 15,
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        displayName: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        selector: {
            height: 28,
            width: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#888',
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorContainer: {
            height: 50,
            paddingRight: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorDisabled: {
            backgroundColor: '#888',
        },
        selectorFilled: {
            backgroundColor: '#378FD2',
            borderWidth: 0,
        },
    };
});
