// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {TouchableHighlight, View} from 'react-native';
import RNBottomSheet from 'react-native-bottom-sheet';

export default class OptionsContext extends PureComponent {
    static propTypes = {
        actions: PropTypes.array,
        cancelText: PropTypes.string,
        children: PropTypes.node.isRequired,
        onPress: PropTypes.func.isRequired,
        toggleSelected: PropTypes.func.isRequired,
    };

    static defaultProps = {
        actions: [],
        cancelText: 'Cancel',
    };

    show = (additionalAction) => {
        const {actions, cancelText} = this.props;
        const nextActions = [...actions];
        if (additionalAction && !additionalAction.nativeEvent && additionalAction.text) {
            const copyPostIndex = nextActions.findIndex((action) => action.copyPost);
            nextActions.splice(copyPostIndex + 1, 0, additionalAction);
        }

        if (nextActions.length) {
            const actionsText = nextActions.map((a) => a.text);
            RNBottomSheet.showBottomSheetWithOptions({
                options: [...actionsText, cancelText],
                cancelButtonIndex: nextActions.length,
            }, (value) => {
                if (value !== nextActions.length) {
                    const selectedOption = nextActions[value];
                    if (selectedOption && selectedOption.onPress) {
                        selectedOption.onPress();
                    }
                }
            });
        }
    };

    handleHideUnderlay = () => {
        this.props.toggleSelected(false, this.props.actions.length > 0);
    };

    handleShowUnderlay = () => {
        this.props.toggleSelected(true, this.props.actions.length > 0);
    };

    render() {
        return (
            <TouchableHighlight
                onHideUnderlay={this.handleHideUnderlay}
                onLongPress={this.show}
                onPress={this.props.onPress}
                onShowUnderlay={this.handleShowUnderlay}
                underlayColor='transparent'
                style={{flex: 1, flexDirection: 'row'}}
            >
                <View style={{flex: 1}}>
                    {this.props.children}
                </View>
            </TouchableHighlight>
        );
    }
}
