// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack} from 'app/actions/navigation';

import {getComponentForScene} from 'app/scenes';

import {Easing, NavigationExperimental, View} from 'react-native';
import FormattedText from 'app/components/formatted_text';

class Router extends React.Component {
    static propTypes = {
        navigation: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goBack: React.PropTypes.func
        }).isRequired
    }

    renderTransition = (transitionProps) => {
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
        const SceneComponent = getComponentForScene(scene.route.key);

        return <SceneComponent {...scene.route.props}/>;
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
