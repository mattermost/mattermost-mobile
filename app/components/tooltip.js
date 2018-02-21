// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import RNToolTip from 'react-native-tooltip';

import {setToolTipVisible} from 'app/utils/tooltip';

export default class ToolTip extends PureComponent {
    static propTypes = {
        onHide: PropTypes.func,
        onShow: PropTypes.func,
    };

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
