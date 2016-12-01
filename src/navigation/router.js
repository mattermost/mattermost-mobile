// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack} from 'actions/navigation';

import LoginContainer from 'routes/login/login_container.js';
import SelectServerContainer from 'routes/select_server/select_server_container.js';
import SelectTeamContainer from 'routes/select_team/select_team_container.js';
import ChannelContainer from 'routes/channel/channel_container.js';

import FormattedText from 'components/formatted_text.js';
import {NavigationExperimental, View} from 'react-native';

class Router extends React.Component {
    static propTypes = {
        navigation: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goBack: React.PropTypes.func
        }).isRequired
    }

    renderTransition = (transitionProps/*, prevTransitionProps*/) => {
        // let cardStyle;
        // if (currentSceneIsModal) {
        //     // Override modals to come in vertically
        //     cardStyle = NavigationCard.CardStackStyleInterpolator.forVertical(props);
        // }

        // let panHandlers;
        // if (currentSceneIsModal) {
        //     // Explicitly set pan handlers to null to let NavigationCard override it and disable swiping back to
        //     // close the modal
        //     panHandlers = null;
        // }

        let title;
        if (transitionProps.scene.route.title) {
            title = (
                <NavigationExperimental.Header
                    {...transitionProps}
                    onNavigateBack={this.props.actions.goBack}
                    renderTitleComponent={this.renderTitle}
                />
            );
        }

        return (
            <View>
                <NavigationExperimental.Card
                    {...transitionProps}
                    onNavigateBack={this.props.actions.goBack}
                    renderScene={this.renderScene}
                    key={transitionProps.scene.route.key}
                />
                {title}
            </View>
        );
    }

    renderTitle = ({scene}) => {
        const title = scene.route.title;

        if (!title) {
            return null;
        }

        return (
            <NavigationExperimental.Header.Title>
                <FormattedText
                    id={title.id}
                    defaultMessage={title.defaultMessage}
                />
            </NavigationExperimental.Header.Title>
        );
    }

    renderScene = ({scene}) => {
        switch (scene.route.key) {
        case 'select_server':
            return <SelectServerContainer/>;
        case 'login':
            return <LoginContainer/>;
        case 'select_team':
            return <SelectTeamContainer/>;
        case 'channel':
            return <ChannelContainer/>;
        default:
            return null;
        }
    }

    render = () => {
        return (
            <NavigationExperimental.Transitioner
                navigationState={this.props.navigation}
                render={this.renderTransition}
            />
        );
    }
}

function mapStateToProps(state) {
    return {
        navigation: state.navigation
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Router);
