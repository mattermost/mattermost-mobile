// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Easing,
    NavigationExperimental,
    View
} from 'react-native';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {closeDrawers, goBack} from 'app/actions/navigation';
import Drawer from 'app/components/drawer';
import FormattedText from 'app/components/formatted_text';
import {RouteTransitions} from 'app/navigation/routes';
import {getComponentForScene} from 'app/scenes';

class Router extends React.Component {
    static propTypes = {
        navigation: React.PropTypes.object,
        actions: React.PropTypes.shape({
            closeDrawers: React.PropTypes.func.isRequired,
            goBack: React.PropTypes.func.isRequired
        }).isRequired
    };

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

            let style;
            if (scene.route.transition === RouteTransitions.Horizontal) {
                style = NavigationExperimental.Card.PagerStyleInterpolator.forHorizontal({
                    ...cardProps
                });
            } else {
                style = {};
            }

            return (
                <NavigationExperimental.Card
                    {...cardProps}
                    style={style}
                    renderScene={this.renderScene}
                    key={scene.key}
                />
            );
        });

        return (
            <View style={{flex: 1}}>
                {title}
                {renderedScenes}
            </View>
        );
    };

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
    };

    renderScene = ({scene}) => {
        return this.renderRoute(scene.route);
    };

    renderRoute = (route) => {
        const SceneComponent = getComponentForScene(route.key);

        return <SceneComponent {...route.props}/>;
    }

    configureTransition = () => {
        return {
            duration: 500,
            easing: Easing.inOut(Easing.ease)
        };
    };

    render = () => {
        const {
            leftDrawerOpen,
            leftDrawerRoute,
            rightDrawerOpen,
            rightDrawerRoute
        } = this.props.navigation;

        let leftDrawerContent;
        if (leftDrawerRoute) {
            leftDrawerContent = this.renderRoute(leftDrawerRoute);
        }

        let rightDrawerContent;
        if (rightDrawerRoute) {
            rightDrawerContent = this.renderRoute(rightDrawerRoute);
        }

        return (
            <Drawer
                open={leftDrawerOpen}
                type='displace'
                content={leftDrawerContent}
                tapToClose={true}
                openDrawerOffset={0.2}
                onRequestClose={this.props.actions.closeDrawers}
            >
                <Drawer
                    open={rightDrawerOpen}
                    type='displace'
                    side='right'
                    content={rightDrawerContent}
                    tapToClose={true}
                    openDrawerOffset={0.2}
                    onRequestClose={this.props.actions.closeDrawers}
                >
                    <NavigationExperimental.Transitioner
                        style={{flex: 1}}
                        navigationState={this.props.navigation}
                        render={this.renderTransition}
                        configureTransition={this.configureTransition}
                    />
                </Drawer>
            </Drawer>
        );
    };
}

function mapStateToProps(state) {
    return {
        navigation: state.navigation
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDrawers,
            goBack
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Router);
