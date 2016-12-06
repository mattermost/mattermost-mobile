// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack} from 'actions/navigation';

import LoginContainer from 'routes/login/login_container';
import SelectServerContainer from 'routes/select_server/select_server_container';
import SelectTeamContainer from 'routes/select_team/select_team_container';
import ChannelContainer from 'routes/channel/channel_container';
import SearchContainer from 'routes/search/search_container';

import {Easing, NavigationExperimental, View} from 'react-native';
import FormattedText from 'components/formatted_text.js';

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

        const renderedScenes = transitionProps.scenes.map((scene) => {
            const cardProps = {
                ...transitionProps,
                scene
            };

            return (
                <NavigationExperimental.Card
                    {...cardProps}
                    style={NavigationExperimental.Card.PagerStyleInterpolator.forHorizontal({
                        ...cardProps,
                        onNavigateBack: this.props.actions.goBack
                    })}
                    onNavigateBack={this.props.actions.goBack}
                    renderScene={this.renderScene}
                    key={scene.key}
                />
            );
        });

        return (
            <View style={{flex: 1, flexDirection: 'column-reverse'}}>
                <View style={{flex: 1}}>
                    {renderedScenes}
                </View>
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
        const sceneProps = scene.route.props;

        switch (scene.route.key) {
        case 'select_server':
            return <SelectServerContainer {...sceneProps}/>;
        case 'login':
            return <LoginContainer {...sceneProps}/>;
        case 'select_team':
            return <SelectTeamContainer {...sceneProps}/>;
        case 'channel':
            return <ChannelContainer {...sceneProps}/>;
        case 'search':
            return <SearchContainer {...sceneProps}/>;
        default:
            return null;
        }
    }

    configureTransition = () => {
        return {
            duration: 500,
            easing: Easing.inOut(Easing.ease)
        };
    }

    render = () => {
        return (
            <NavigationExperimental.Transitioner
                style={{flex: 1}}
                navigationState={this.props.navigation}
                render={this.renderTransition}
                configureTransition={this.configureTransition}
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
