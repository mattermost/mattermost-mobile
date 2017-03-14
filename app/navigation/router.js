// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Dimensions,
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
import {getTheme} from 'service/selectors/entities/preferences';
import ErrorList from 'app/components/error_list';
import NavigationModal from './navigation_modal';

const navigationPanResponder = NavigationExperimental.Card.CardStackPanResponder;

class Router extends React.Component {
    static propTypes = {
        navigation: React.PropTypes.object,
        theme: React.PropTypes.object,
        actions: React.PropTypes.shape({
            closeDrawers: React.PropTypes.func.isRequired,
            goBack: React.PropTypes.func.isRequired
        }).isRequired
    };

    headerEventSubscriptions = {};

    emitHeaderEvent = (key) => (event) => {
        const subscription = this.headerEventSubscriptions[`${key}-${event}`];
        if (subscription) {
            subscription();
        }
    };

    subscribeToHeaderEvent = (key) => (event, callback) => {
        this.headerEventSubscriptions[`${key}-${event}`] = callback;
    };

    unsubscribeFromHeaderEvent = (key) => (event) => {
        if (this.headerEventSubscriptions[event]) {
            Reflect.deleteProperty(this.headerEventSubscriptions, `${key}-${event}`);
        }
    };

    wrapHeaderComponent = (fx, emitter) => (props) => {
        if (fx && props.scene.isActive) {
            return fx(props, emitter, this.props.theme);
        }

        return null;
    };

    extractNavigationProps = (route) => {
        return Object.assign({}, route.navigationProps, route.component.navigationProps);
    };

    renderTransition = (transitionProps) => {
        const navigationProps = this.extractNavigationProps(transitionProps.scene.route);
        let navBar = null;
        if (!navigationProps.hideNavBar) {
            const emitter = this.emitHeaderEvent(transitionProps.scene.route.key);
            const renderLeftComponent = transitionProps.navigationState.index > 0 ? this.wrapHeaderComponent(navigationProps.renderBackButton, emitter) : this.wrapHeaderComponent(navigationProps.renderLeftComponent, emitter);
            const renderTitleComponent = navigationProps.renderTitleComponent ? this.wrapHeaderComponent(navigationProps.renderTitleComponent, emitter) : this.renderTitle;
            const renderRightComponent = this.wrapHeaderComponent(navigationProps.renderRightComponent, emitter);

            navBar = (
                <NavigationExperimental.Header
                    {...transitionProps}
                    onNavigateBack={this.props.actions.goBack}
                    renderLeftComponent={renderLeftComponent}
                    renderTitleComponent={renderTitleComponent}
                    renderRightComponent={renderRightComponent}
                    style={[{backgroundColor: this.props.theme.sidebarHeaderBg}, navigationProps.headerStyle]}
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
                // have to override shadow props for transparent modals
                style = {
                    backgroundColor: 'transparent',
                    shadowColor: null,
                    shadowOffset: null,
                    shadowOpacity: null,
                    shadowRadius: null
                };
            }

            let panHandlers = null;
            if (navigationProps.allowSceneSwipe) {
                panHandlers = navigationPanResponder.forHorizontal({
                    ...cardProps,
                    gestureResponseDistance: (Dimensions.get('window').width / 2), // sets the distance from the edge for swiping
                    onNavigateBack: this.props.actions.goBack
                });
            }
            return (
                <NavigationExperimental.Card
                    {...cardProps}
                    onNavigateBack={this.props.actions.goBack}
                    panHandlers={panHandlers}
                    style={style}
                    renderScene={this.renderScene}
                    key={scene.key}
                />
            );
        });

        return (
            <View style={{flex: 1, flexDirection: 'column-reverse'}}>
                <View style={{flex: 1}}>
                    {renderedScenes}
                    <ErrorList/>
                </View>
                {navBar}
            </View>
        );
    };

    renderTitle = ({scene}) => {
        const navigationProps = this.extractNavigationProps(scene.route);
        const title = navigationProps.title;

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
        const SceneComponent = route.component;

        const emitterSubscriber = this.subscribeToHeaderEvent(route.key);
        const emitterUnsubscriber = this.unsubscribeFromHeaderEvent(route.key);

        return (
            <SceneComponent
                subscribeToHeaderEvent={emitterSubscriber}
                unsubscribeFromHeaderEvent={emitterUnsubscriber}
                {...route.props}
            />
        );
    };

    configureTransition = () => {
        return {
            duration: 300,
            easing: Easing.inOut(Easing.ease)
        };
    };

    render = () => {
        const {
            index,
            leftDrawerOpen,
            leftDrawerRoute,
            rightDrawerOpen,
            rightDrawerRoute,
            routes,
            isModal: modalVisible
        } = this.props.navigation;
        const navigationProps = this.extractNavigationProps(routes[index]);

        let leftDrawerContent;
        if (leftDrawerRoute) {
            leftDrawerContent = this.renderRoute(leftDrawerRoute);
        }

        let rightDrawerContent;
        if (rightDrawerRoute) {
            rightDrawerContent = this.renderRoute(rightDrawerRoute);
        }

        return (
            <View style={{flex: 1}}>
                <Drawer
                    open={leftDrawerOpen}
                    type='displace'
                    disabled={modalVisible}
                    content={leftDrawerContent}
                    tapToClose={true}
                    openDrawerOffset={0.2}
                    onRequestClose={this.props.actions.closeDrawers}
                    panOpenMask={0.4}
                    panCloseMask={0.2}
                    panThreshold={0.2}
                    acceptPan={navigationProps.allowMenuSwipe}
                    negotiatePan={true}
                    useInteractionManager={true}
                >
                    <Drawer
                        open={rightDrawerOpen}
                        type='displace'
                        side='right'
                        disabled={modalVisible}
                        content={rightDrawerContent}
                        tapToClose={true}
                        openDrawerOffset={0.2}
                        onRequestClose={this.props.actions.closeDrawers}
                        panOpenMask={0.4}
                        panCloseMask={0.2}
                        panThreshold={0.2}
                        acceptPan={navigationProps.allowMenuSwipe}
                        negotiatePan={true}
                        useInteractionManager={true}
                    >
                        <NavigationExperimental.Transitioner
                            style={{flex: 1}}
                            navigationState={this.props.navigation}
                            render={this.renderTransition}
                            configureTransition={this.configureTransition}
                        />
                    </Drawer>
                </Drawer>
                <NavigationModal show={modalVisible}>
                    <NavigationExperimental.Transitioner
                        style={{flex: 1}}
                        navigationState={this.props.navigation.modal}
                        render={this.renderTransition}
                        configureTransition={this.configureTransition}
                    />
                </NavigationModal>
            </View>
        );
    };
}

function mapStateToProps(state) {
    return {
        navigation: state.navigation,
        theme: getTheme(state)
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
