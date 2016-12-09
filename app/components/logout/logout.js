// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {TouchableHighlight} from 'react-native';
import FormattedText from 'app/components/formatted_text';

export default class Logout extends React.Component {
    static propTypes = {
        actions: React.PropTypes.object.isRequired
    }

    render() {
        return (
            <TouchableHighlight onPress={this.props.actions.logout}>
                <FormattedText
                    id='sidebar_right_menu.logout'
                    defaultMessage='Logout'
                />
            </TouchableHighlight>
        );
    }
}
