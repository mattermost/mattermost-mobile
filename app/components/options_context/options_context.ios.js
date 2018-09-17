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

    beforeShow = (additionalAction) => {
        const nextActions = this.props.getPostActions();
        if (additionalAction && additionalAction.text && !additionalAction.nativeEvent) {
            const copyPostIndex = nextActions.findIndex((action) => action.copyPost);
            nextActions.splice(copyPostIndex + 1, 0, additionalAction);
        }

        this.setState({
            actions: nextActions,
        });
    };

    handleHide = () => {
        this.isShowing = false;
        this.props.toggleSelected(false);
    };

    handleHideUnderlay = () => {
        if (!this.isShowing) {
            this.props.toggleSelected(false);
        }
    };

    handleShow = () => {
        this.isShowing = true;
        this.props.toggleSelected(true);
    }

    handleShowUnderlay = () => {
        this.beforeShow();
        this.props.toggleSelected(true);
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

    handlePress = () => {
        this.props.toggleSelected(false);
        this.props.onPress();
    };

    show = (additionalAction) => {
        this.props.toggleSelected(true);
        this.beforeShow(additionalAction);

        if (this.refs.toolTip) {
            this.refs.toolTip.showMenu();
        }
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
                onShow={this.handleShow}
                onPress={this.handlePress}
                underlayColor='transparent'
            >
                {this.props.children}
            </ToolTip>
        );
    }
}
