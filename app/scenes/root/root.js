// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import Loading from 'app/components/loading';

import {RequestStatus} from 'service/constants';

export default class Root extends React.Component {
    static propTypes = {
        credentials: React.PropTypes.object,
        logoutRequest: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goToSelectServer: React.PropTypes.func,
            goToSelectTeam: React.PropTypes.func,
            loadStorage: React.PropTypes.func,
            removeStorage: React.PropTypes.func,
            setStoreFromLocalData: React.PropTypes.func,
            resetLogout: React.PropTypes.func
        }).isRequired
    };

    componentDidMount() {
        // Any initialization logic for navigation, setting up the client, etc should go here

        if (this.props.logoutRequest.status === RequestStatus.SUCCESS) {
            this.props.actions.removeStorage().then(() => {
                setTimeout(this.loadStoreAndScene, 1000);
            });
        } else {
            this.loadStoreAndScene();
        }
    }

    loadStoreAndScene = () => {
        this.props.actions.loadStorage().then(() => {
            if (this.props.credentials.token && this.props.credentials.url) {
                this.props.actions.setStoreFromLocalData(this.props.credentials).then(this.props.actions.goToSelectTeam);
            } else {
                this.props.actions.goToSelectServer();
            }
        });
    };

    render() {
        return <Loading/>;
    }
}
