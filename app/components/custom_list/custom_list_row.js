// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    StyleSheet,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import ConditionalTouchable from 'app/components/conditional_touchable';
import CustomPropTypes from 'app/constants/custom_prop_types';

export default class CustomListRow extends React.PureComponent {
    static propTypes = {
        onPress: PropTypes.func,
        enabled: PropTypes.bool,
        selectable: PropTypes.bool,
        selected: PropTypes.bool,
        children: CustomPropTypes.Children,
        item: PropTypes.object,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        enabled: true,
        isLandscape: false,
    };

    render() {
        return (
            <ConditionalTouchable
                touchable={Boolean(this.props.enabled && this.props.onPress)}
                onPress={this.props.onPress}
                style={style.touchable}
            >
                <View style={[style.container, padding(this.props.isLandscape)]}>
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
                    <View style={style.children}>
                        {this.props.children}
                    </View>
                </View>
            </ConditionalTouchable>
        );
    }
}

const style = StyleSheet.create({
    touchable: {
        flex: 1,
        overflow: 'hidden',
    },
    container: {
        flexDirection: 'row',
        height: 65,
        flex: 1,
        alignItems: 'center',
    },
    children: {
        flex: 1,
        flexDirection: 'row',
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
        paddingRight: 10,
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
});
