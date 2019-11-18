// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import FailedNetworkAction from 'app/components/failed_network_action';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import {resetToChannel} from 'app/actions/navigation';
import {makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class ErrorTeamsList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadMe: PropTypes.func.isRequired,
            connection: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            selectDefaultTeam: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        theme: PropTypes.object,
    };

    constructor(props) {
        super(props);

        this.state = {
            loading: false,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentDidUpdate(prevProps) {
        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.componentId, this.props.theme);
        }
    }

    navigationButtonPressed({buttonId}) {
        const {logout} = this.props.actions;
        if (buttonId === 'logout') {
            InteractionManager.runAfterInteractions(logout);
        }
    }

    goToChannelView = () => {
        const passProps = {
            disableTermsModal: true,
        };
        resetToChannel(passProps);
    };

    getUserInfo = async () => {
        try {
            this.setState({loading: true});
            this.props.actions.connection(true);
            await this.props.actions.loadMe();
            this.props.actions.selectDefaultTeam();
            this.goToChannelView();
        } catch {
            this.props.actions.connection(false);
        } finally {
            this.setState({loading: false});
        }
    }

    render() {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        if (this.state.loading) {
            return <Loading color={theme.centerChannelColor}/>;
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <FailedNetworkAction
                    onRetry={this.getUserInfo}
                    theme={theme}
                />
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
    };
});
