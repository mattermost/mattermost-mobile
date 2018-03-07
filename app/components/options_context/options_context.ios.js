// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import ToolTip from 'app/components/tooltip';

export default class OptionsContext extends PureComponent {
    static propTypes = {
        actions: PropTypes.array,
        children: PropTypes.node.isRequired,
        onPress: PropTypes.func.isRequired,
        toggleSelected: PropTypes.func.isRequired,
    };

    static defaultProps = {
        actions: [],
        additionalActions: [],
    };

    constructor(props) {
        super(props);

        this.state = {
            actions: props.actions,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.actions !== nextProps.actions) {
            this.setState({actions: nextProps.actions});
        }
    }

    handleHideUnderlay = () => {
        if (!this.isShowing) {
            this.props.toggleSelected(false, false);
        }
    };

    handleShowUnderlay = () => {
        this.props.toggleSelected(true, false);
    };

    handleHide = () => {
        this.isShowing = false;
        this.props.toggleSelected(false, this.props.actions.length > 0);
    };

    handleShow = () => {
        this.isShowing = this.props.actions.length > 0;
        this.props.toggleSelected(true, this.isShowing);
    };

    hide = () => {
        if (this.refs.toolTip) {
            this.refs.toolTip.hideMenu();
        }

        this.setState({
            actions: this.props.actions,
        });
    };

    show = (additionalAction) => {
        const nextActions = [...this.props.actions];
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
        this.props.toggleSelected(false, this.props.actions.length > 0);
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
                onPress={this.handlePress}
                underlayColor='transparent'
                onShow={this.handleShow}
                onHide={this.handleHide}
            >
                {this.props.children}
            </ToolTip>
        );
    }
}
