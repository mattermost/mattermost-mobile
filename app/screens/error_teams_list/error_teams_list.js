// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    View,
} from 'react-native';

import FailedNetworkAction from 'app/components/failed_network_action';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import {makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

const errorTitle = {
    id: t('error.team_not_found.title'),
    defaultMessage: 'Team Not Found',
};

const errorDescription = {
    id: t('mobile.failed_network_action.shortDescription'),
    defaultMessage: 'Make sure you have an active connection and try again.',
};

export default class ErrorTeamsList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadMe: PropTypes.func.isRequired,
            connection: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            selectDefaultTeam: PropTypes.func.isRequired,
        }).isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object,
    };

    constructor(props) {
        super(props);
        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        this.state = {
            loading: false,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    goToChannelView = () => {
        const {navigator, theme} = this.props;

        navigator.resetTo({
            screen: 'Channel',
            animated: false,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                disableTermsModal: true,
            },
        });
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

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            const {logout} = this.props.actions;
            if (event.id === 'logout') {
                InteractionManager.runAfterInteractions(logout);
            }
        }
    };

    render() {
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        if (this.state.loading) {
            return <Loading/>;
        }

        return (
            <View style={styles.container}>
                <StatusBar/>
                <FailedNetworkAction
                    onRetry={this.getUserInfo}
                    theme={theme}
                    errorTitle={errorTitle}
                    errorDescription={errorDescription}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
    };
});
