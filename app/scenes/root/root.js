// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

export default class Root extends React.Component {
    static propTypes = {
        actions: React.PropTypes.object.isRequired
    };

    componentDidMount() {
        // Any initialization logic for navigation, setting up the client, etc should go here

        this.props.actions.goToSelectServer();
    }

    render() {
        return null;
    }
}
