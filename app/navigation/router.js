// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Easing,
    NavigationExperimental,
    View
} from 'react-native';
import Drawer from 'react-native-drawer';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {goBack} from 'app/actions/navigation';
import FormattedText from 'app/components/formatted_text';
import {getComponentForScene} from 'app/scenes';

import {RouteTransitions, RouteTypes} from 'app/navigation/routes';

class Router extends React.Component {
    static propTypes = {
        navigation: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goBack: React.PropTypes.func
        }).isRequired
    };

    renderTransition = (transitionProps, prevTransitionProps) => {
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

        const renderedScenes = transitionProps.scenes.filter((scene) => {
            const route = scene.route;

            // Drawer scenes are rendered separately
            return !(route.type === RouteTypes.LeftDrawer || route.type === RouteTypes.RightDrawer);
        }).map((scene) => {
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

        let leftDrawerContent;
        if (transitionProps.scene.route.type === RouteTypes.LeftDrawer) {
            leftDrawerContent = this.renderScene({scene: transitionProps.scene});
        } else if (prevTransitionProps && prevTransitionProps.scene.route.type === RouteTypes.LeftDrawer) {
            // Render the drawer scene that's transitioning out
            leftDrawerContent = this.renderScene({scene: prevTransitionProps.scene});
        }

        let rightDrawerContent;
        if (transitionProps.scene.route.type === RouteTypes.RightDrawer) {
            rightDrawerContent = this.renderScene({scene: transitionProps.scene});
        } else if (prevTransitionProps && prevTransitionProps.scene.route.type === RouteTypes.RightDrawer) {
            // Render the drawer scene that's transitioning out
            rightDrawerContent = this.renderScene({scene: prevTransitionProps.scene});
        }

        // Render only the main scene inside of the drawer so that the other scenes don't appear when
        // the drawer opens or closes
        const currentMainScene = renderedScenes[renderedScenes.length - 1];
        renderedScenes.pop();

        return (
            <View style={{flex: 1}}>
                <View style={{flex: 1}}>
                    {renderedScenes}
                    <Drawer
                        open={transitionProps.scene.route.type === RouteTypes.LeftDrawer}
                        type='displace'
                        content={leftDrawerContent}
                        tapToClose={true}
                        onCloseStart={this.props.actions.goBack}
                        openDrawerOffset={0.2}
                    >
                        <Drawer
                            open={transitionProps.scene.route.type === RouteTypes.RightDrawer}
                            type='displace'
                            side='right'
                            content={rightDrawerContent}
                            tapToClose={true}
                            onCloseStart={this.props.actions.goBack}
                            openDrawerOffset={0.2}
                        >
                            {currentMainScene}
                        </Drawer>
                    </Drawer>
                </View>
                {title}
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
        const SceneComponent = getComponentForScene(scene.route.key);

        return <SceneComponent {...scene.route.props}/>;
    };

    configureTransition = () => {
        return {
            duration: 500,
            easing: Easing.inOut(Easing.ease)
        };
    };

    render = () => {
        return (
            <NavigationExperimental.Transitioner
                style={{flex: 1}}
                navigationState={this.props.navigation}
                render={this.renderTransition}
                configureTransition={this.configureTransition}
            />
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
            goBack
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Router);
