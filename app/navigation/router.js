// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    Dimensions,
    Easing,
    InteractionManager,
    Keyboard,
    NavigationExperimental,
    View
} from 'react-native';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {closeDrawers, goBack, openChannelDrawer} from 'app/actions/navigation';
import Drawer from 'app/components/drawer';
import FormattedText from 'app/components/formatted_text';
import {RouteTransitions} from 'app/navigation/routes';
import {getTheme} from 'app/selectors/preferences';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import NavigationModal from './navigation_modal';

const navigationPanResponder = NavigationExperimental.Card.CardStackPanResponder;

const {width: deviceWidth, height: deviceHeight} = Dimensions.get('window');

class Router extends Component {
    static propTypes = {
        navigation: PropTypes.object,
        theme: PropTypes.object,
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            openChannelDrawer: PropTypes.func.isRequired
        }).isRequired
    };

    headerEventSubscriptions = {};

    state = {
        deviceHeight,
        deviceWidth
    };

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
        if (!route) {
            return {};
        }

        let component = route.component;
        if (!component) {
            component = {};
        }

        return Object.assign({}, route.navigationProps, component.navigationProps);
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
                    gestureResponseDistance: (this.state.deviceWidth / 4), // sets the distance from the edge for swiping
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

    onLayout = (event) => {
        if (event.nativeEvent.layout.width !== this.state.deviceWidth) {
            this.setState({
                deviceHeight: event.nativeEvent.layout.height,
                deviceWidth: event.nativeEvent.layout.width
            });
        }
    };

    handleDrawerTween = (ratio) => {
        const opacity = (ratio / 2);

        EventEmitter.emit('drawer_opacity', opacity);

        return {
            mainOverlay: {
                backgroundColor: this.props.theme.centerChannelBg,
                opacity
            },
            drawerOverlay: {
                backgroundColor: ratio ? '#000' : '#FFF',
                opacity: ratio ? (1 - ratio) / 2 : 1
            }
        };
    };

    handleLeftDrawerClose = () => {
        setTimeout(() => {
            InteractionManager.clearInteractionHandle(this.closeLeftHandle);
        });
    };

    handleLeftDrawerCloseStart = () => {
        this.closeLeftHandle = InteractionManager.createInteractionHandle();
    };

    handleLeftDrawerOpen = () => {
        Keyboard.dismiss();
        setTimeout(() => {
            InteractionManager.clearInteractionHandle(this.openLeftHandle);
        });
    };

    handleLeftDrawerOpenStart = () => {
        this.props.actions.openChannelDrawer();
        this.openLeftHandle = InteractionManager.createInteractionHandle();
    };

    render = () => {
        const {
            index,
            isModal: modalVisible,
            leftDrawerOpen,
            leftDrawerRoute,
            modal,
            shouldRenderDrawer,
            routes
        } = this.props.navigation;

        const navigationProps = this.extractNavigationProps(routes[index]);
        const modalNavigationProps = this.extractNavigationProps(modal.routes[0]);

        let leftDrawerContent;
        if (leftDrawerRoute && shouldRenderDrawer) {
            leftDrawerContent = this.renderRoute(leftDrawerRoute);
        }

        return (
            <View
                style={{flex: 1}}
                onLayout={this.onLayout}
            >
                <Drawer
                    open={leftDrawerOpen}
                    onOpenStart={this.handleLeftDrawerOpenStart}
                    onOpen={this.handleLeftDrawerOpen}
                    onCloseStart={this.handleLeftDrawerCloseStart}
                    onClose={this.handleLeftDrawerClose}
                    type='static'
                    disabled={modalVisible}
                    content={leftDrawerContent}
                    tapToClose={true}
                    openDrawerOffset={40}
                    onRequestClose={this.props.actions.closeDrawers}
                    panOpenMask={0.2}
                    panCloseMask={40}
                    panThreshold={0.25}
                    acceptPan={navigationProps.allowMenuSwipe}
                    negotiatePan={true}
                    useInteractionManager={false}
                    tweenHandler={this.handleDrawerTween}
                    elevation={-5}
                    styles={{
                        main: {shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: {width: -4, height: 0}}
                    }}
                >
                    <Drawer
                        open={false}
                        type='displace'
                        side='right'
                        disabled={true}
                        content={null}
                        tapToClose={true}
                        openDrawerOffset={50}
                        onRequestClose={this.props.actions.closeDrawers}
                        panOpenMask={0}
                        panCloseMask={50}
                        panThreshold={0}
                        acceptPan={false}
                        negotiatePan={false}
                        useInteractionManager={false}
                        tweenHandler={this.handleDrawerTween}
                    >
                        <NavigationExperimental.Transitioner
                            style={{flex: 1}}
                            navigationState={this.props.navigation}
                            render={this.renderTransition}
                            configureTransition={this.configureTransition}
                        />
                    </Drawer>
                </Drawer>
                <NavigationModal
                    animationType={modalNavigationProps.modalAnimationType}
                    deviceHeight={this.state.deviceHeight}
                    deviceWidth={this.state.deviceWidth}
                    duration={modalNavigationProps.duration}
                    show={modalVisible}
                >
                    <NavigationExperimental.Transitioner
                        style={{flex: 1}}
                        navigationState={modal}
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
            goBack,
            openChannelDrawer
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Router);
