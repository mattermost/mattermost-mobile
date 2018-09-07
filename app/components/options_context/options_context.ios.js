// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import ToolTip from 'app/components/tooltip';

export default class OptionsContext extends PureComponent {
    static propTypes = {
        getPostActions: PropTypes.func,
        children: PropTypes.node.isRequired,
        onPress: PropTypes.func.isRequired,
        toggleSelected: PropTypes.func.isRequired,
    };

    static defaultProps = {
        getPostActions: () => [],
        additionalActions: [],
    };

    constructor(props) {
        super(props);

        this.state = {
            actions: props.getPostActions(),
        };
    }

    handleHide = () => {
        this.isShowing = false;
        this.props.toggleSelected(false);
    };

    handleHideUnderlay = () => {
        if (!this.isShowing) {
            this.props.toggleSelected(false);
        }
    };

    handleShowUnderlay = () => {
        this.show();
        this.props.toggleSelected(true);
        this.isShowing = this.state.actions.length > 0;
    };

    hide = () => {
        this.setState({
            actions: this.props.getPostActions(),
        });

        if (this.refs.toolTip) {
            this.refs.toolTip.hideMenu();
        }

        this.isShowing = false;
        this.props.toggleSelected(false);
    };

    show = (additionalAction) => {
        const nextActions = this.props.getPostActions();
        if (additionalAction && additionalAction.text && !additionalAction.nativeEvent) {
            const copyPostIndex = nextActions.findIndex((action) => action.copyPost);
            nextActions.splice(copyPostIndex + 1, 0, additionalAction);
        }

        this.setState({
            actions: nextActions,
        });

        if (this.refs.toolTip) {
            this.refs.toolTip.showMenu();
        }
    };

    handlePress = () => {
        this.props.toggleSelected(false);
        this.props.onPress();
    };

    render() {
        return (
            <ToolTip
                onHideUnderlay={this.handleHideUnderlay}
                onShowUnderlay={this.handleShowUnderlay}
                ref='toolTip'
                actions={this.state.actions}
                arrowDirection='down'
                longPress={true}
                onHide={this.handleHide}
                onPress={this.handlePress}
                underlayColor='transparent'
            >
                {this.props.children}
            </ToolTip>
        );
    }
}
