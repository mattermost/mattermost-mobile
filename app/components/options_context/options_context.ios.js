// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import ToolTip from 'react-native-tooltip';

export default class OptionsContext extends PureComponent {
    static propTypes = {
        actions: PropTypes.array,
        children: PropTypes.node.isRequired,
        onPress: PropTypes.func.isRequired,
        toggleSelected: PropTypes.func.isRequired
    };

    static defaultProps = {
        actions: []
    };

    hide() {
        this.refs.toolTip.hideMenu();
    }

    show() {
        this.refs.toolTip.showMenu();
    }

    render() {
        return (
            <ToolTip
                ref='toolTip'
                actions={this.props.actions}
                arrowDirection='down'
                longPress={true}
                onPress={this.props.onPress}
                underlayColor='transparent'
                onShow={() => this.props.toggleSelected(true)}
                onHide={() => this.props.toggleSelected(false)}
            >
                {this.props.children}
            </ToolTip>
        );
    }
}
