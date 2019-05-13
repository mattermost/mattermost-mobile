// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import RNToolTip from 'react-native-tooltip';

import {setToolTipVisible, getToolTipVisible} from 'app/utils/tooltip';

export default class ToolTip extends PureComponent {
    static propTypes = {
        onHide: PropTypes.func,
        onShow: PropTypes.func,
        actions: PropTypes.array.isRequired,
    };

    static defaultProps = {
        actions: [],
    }

    handleHide = () => {
        if (this.props.onHide) {
            this.props.onHide();
        }
        setToolTipVisible(false);
    };

    handleShow = () => {
        if (this.props.onShow) {
            this.props.onShow();
        }
        setToolTipVisible();
    };

    hideMenu = () => {
        if (this.refs.toolTip) {
            this.refs.toolTip.hideMenu();
        }
    };

    showMenu = () => {
        if (this.refs.toolTip) {
            this.refs.toolTip.showMenu();
        }
    };

    componentDidUpdate(prevProps) {
        if (prevProps.actions.length !== this.props.actions.length && getToolTipVisible()) {
            this.refs.toolTip.hideMenu();
            setTimeout(() => this.refs.toolTip.showMenu(), 1);
        }
    }

    render() {
        return (
            <RNToolTip
                {...this.props}
                onHide={this.handleHide}
                onShow={this.handleShow}
                ref='toolTip'
            />
        );
    }
}
