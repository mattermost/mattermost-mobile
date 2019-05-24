// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Typing from './components/typing';
import PostTextBoxBase from './post_textbox_base';

export default class PostTextBoxIOS extends PostTextBoxBase {
    render() {
        const {deactivatedChannel} = this.props;

        if (deactivatedChannel) {
            return this.renderDeactivatedChannel();
        }

        return (
            <React.Fragment>
                <Typing/>
                {this.renderTextBox()}
            </React.Fragment>
        );
    }
}
