// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import ConditionalTouchable from 'app/components/conditional_touchable';
import CustomPropTypes from 'app/constants/custom_prop_types';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class CustomListRow extends React.PureComponent {
    static propTypes = {
        sectionId: PropTypes.string.isRequired,
        rowId: PropTypes.string.isRequired,
        id: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        onRowSelect: PropTypes.func,
        selected: PropTypes.bool,
        disableSelect: PropTypes.bool,
        children: CustomPropTypes.Children
    };

    static defaultProps = {
        disableSelect: false
    };

    onPress = () => {
        if (this.props.onPress) {
            this.props.onPress(this.props.id);
        } else if (this.props.onRowSelect && !this.props.disableSelect) {
            this.props.onRowSelect(this.props.sectionId, this.props.rowId);
        }
    };

    render() {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <ConditionalTouchable
                touchable={Boolean(this.props.onPress || (!this.props.disableSelect && this.props.onRowSelect))}
                onPress={this.onPress}
            >
                <View style={style.container}>
                    {this.props.onRowSelect &&
                        <View style={style.selectorContainer}>
                            <View style={[style.selector, (this.props.selected && style.selectorFilled), (this.props.disableSelect && style.selectorDisabled)]}>
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
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            height: 65,
            paddingHorizontal: 15,
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg
        },
        displayName: {
            fontSize: 15,
            color: theme.centerChannelColor
        },
        selector: {
            height: 28,
            width: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#888',
            alignItems: 'center',
            justifyContent: 'center'
        },
        selectorContainer: {
            height: 50,
            paddingRight: 15,
            alignItems: 'center',
            justifyContent: 'center'
        },
        selectorDisabled: {
            backgroundColor: '#888'
        },
        selectorFilled: {
            backgroundColor: '#378FD2',
            borderWidth: 0
        }
    });
});
