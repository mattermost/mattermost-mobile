// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Animated, Platform, StyleSheet, View, Easing, ScrollView} from 'react-native';
import {
    PanGestureHandler,
    NativeViewGestureHandler,
    State as GestureState,
    TapGestureHandler,
    HandlerStateChangeEventPayload,
    PanGestureHandlerEventPayload,
    TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import {hapticFeedback} from 'app/utils/general';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import SlideUpPanelIndicator from './slide_up_panel_indicator';
import {Theme} from '@mm-redux/types/preferences';

export const BOTTOM_MARGIN = mattermostManaged.hasSafeAreaInsets ? 24 : 0;
const TOP_IOS_MARGIN = DeviceTypes.IS_IPHONE_WITH_INSETS ? 84 : 64;
const TOP_ANDROID_MARGIN = 44;
const TOP_MARGIN = Platform.OS === 'ios' ? TOP_IOS_MARGIN : TOP_ANDROID_MARGIN;

type Props = {

    // Whether or not to allow the panel to snap to the initial position after it has been opened
    allowStayMiddle?: boolean;

    containerHeight?: number;
    children: React.ReactNode;
    header: (ref: React.RefObject<unknown>) => React.ReactNode,
    headerHeight?: number,

    // The initial position of the SlideUpPanel when it's first opened. If this value is between 0 and 1,
    // it is treated as a percentage of the containerHeight.
    initialPosition?: number,

    // The space between the top of the panel and the top of the container when the SlideUpPanel is fully open.
    marginFromTop?: number,
    onRequestClose?: (cb?: () => void) => void,
    theme: Theme,
}

type State = {
    lastSnap?: number;
}

export default class SlideUpPanel extends PureComponent<Props, State> {
    static defaultProps = {
        allowStayMiddle: true,
        header: () => null,
        headerHeight: 0,
        initialPosition: 0.5,
        marginFromTop: TOP_MARGIN,
        onRequestClose: () => true,
    };

    private masterRef: React.RefObject<TapGestureHandler>;
    private panRef: React.RefObject<PanGestureHandler>;
    private scrollRef: React.RefObject<NativeViewGestureHandler>;
    private scrollViewRef: React.RefObject<ScrollView>;
    private headerRef: React.RefObject<unknown>;
    private backdropRef: React.RefObject<PanGestureHandler>;

    private snapPoints: number[]

    private lastScrollYValue: number
    private lastScrollY: Animated.Value
    private onRegisterLastScroll: (...args: any[]) => void

    private dragY: Animated.Value
    private onGestureEvent: (...args: any[]) => void

    private reverseLastScrollY: Animated.AnimatedMultiplication

    private translateYOffset: Animated.Value

    private translateY: Animated.AnimatedInterpolation

    private backdropOpacity: Animated.AnimatedInterpolation

    constructor(props: Props) {
        super(props);

        const marginFromTop = props.marginFromTop || 0;
        const containerHeight = props.containerHeight || 0;
        const headerHeight = props.headerHeight || 0;

        this.masterRef = React.createRef<TapGestureHandler>();
        this.panRef = React.createRef<PanGestureHandler>();
        this.scrollRef = React.createRef<NativeViewGestureHandler>();
        this.scrollViewRef = React.createRef<ScrollView>();
        this.headerRef = React.createRef<unknown>();
        this.backdropRef = React.createRef<PanGestureHandler>();

        const initialUsedSpace = Math.abs(props.initialPosition || 0);
        let initialPosition;
        if (initialUsedSpace <= 1) {
            initialPosition = ((containerHeight - (headerHeight + BOTTOM_MARGIN)) * (1 - initialUsedSpace));
        } else {
            initialPosition = ((containerHeight - (headerHeight + BOTTOM_MARGIN)) - initialUsedSpace);
        }

        // These values  correspond to when the panel is fully open, when it is initially opened, and when it is closed
        this.snapPoints = [marginFromTop, initialPosition, containerHeight];

        this.state = {
            lastSnap: initialPosition,
        };

        this.lastScrollYValue = 0;
        this.lastScrollY = new Animated.Value(0);
        this.onRegisterLastScroll = Animated.event(
            [{
                nativeEvent: {
                    contentOffset: {
                        y: this.lastScrollY,
                    },
                },
            }],
            {useNativeDriver: true},
        );
        this.lastScrollY.addListener(({value}) => {
            this.lastScrollYValue = value;
        });

        this.dragY = new Animated.Value(0);
        this.onGestureEvent = Animated.event(
            [{
                nativeEvent: {
                    translationY: this.dragY,
                },
            }],
            {useNativeDriver: true},
        );

        this.reverseLastScrollY = Animated.multiply(
            new Animated.Value(-1),
            this.lastScrollY,
        );

        this.translateYOffset = new Animated.Value(containerHeight);
        this.translateY = Animated.add(
            this.translateYOffset,
            Animated.add(this.dragY, this.reverseLastScrollY),
        ).interpolate({
            inputRange: [marginFromTop, containerHeight],
            outputRange: [marginFromTop, containerHeight],
            extrapolate: 'clamp',
        });

        this.backdropOpacity = this.translateY.interpolate({
            inputRange: [marginFromTop, containerHeight],
            outputRange: [0.7, 0],
        });
    }

    componentDidMount() {
        hapticFeedback();

        Animated.timing(this.translateYOffset, {
            toValue: this.snapPoints[1],
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
            duration: 200,
        }).start();
    }

    closeWithAnimation = (cb?: () => void) => {
        Animated.timing(this.translateYOffset, {
            toValue: this.snapPoints[2],
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
            duration: 200,
        }).start(() => this.props.onRequestClose?.(cb));
    };

    onHeaderHandlerStateChange = ({nativeEvent}: {nativeEvent: (HandlerStateChangeEventPayload & PanGestureHandlerEventPayload)}) => {
        if (nativeEvent.oldState === GestureState.BEGAN) {
            this.lastScrollY.setValue(0);
            this.lastScrollYValue = 0;
        }
        this.onHandlerStateChange({nativeEvent});
    };

    onHandlerStateChange = ({nativeEvent}: {nativeEvent: (HandlerStateChangeEventPayload & PanGestureHandlerEventPayload)}) => {
        if (nativeEvent.oldState === GestureState.ACTIVE) {
            const {translationY, velocityY} = nativeEvent;
            const {allowStayMiddle} = this.props;
            const lastSnap = this.state.lastSnap || 0;
            const isGoingDown = translationY > 0;
            const translation = translationY - this.lastScrollYValue;

            const endOffsetY = lastSnap + translation;
            let destSnapPoint: number | undefined = this.snapPoints[0];

            if (Math.abs(translationY) < 50 && allowStayMiddle) {
                // Only drag the panel after moving 50 or more points
                destSnapPoint = lastSnap;
            } else if (isGoingDown && !allowStayMiddle) {
                // Just close the panel if the user pans down and we can't snap to the middle
                destSnapPoint = this.snapPoints[2];
            } else if (isGoingDown) {
                destSnapPoint = this.snapPoints.find((s) => s >= endOffsetY);
                if (!destSnapPoint) {
                    destSnapPoint = this.snapPoints[2];
                }
            } else {
                destSnapPoint = this.snapPoints.find((s) => s <= endOffsetY);
                if (!destSnapPoint) {
                    destSnapPoint = this.snapPoints[0];
                }
            }

            this.translateYOffset.extractOffset();
            this.translateYOffset.setValue(translationY);
            this.translateYOffset.flattenOffset();
            this.dragY.setValue(0);

            if (destSnapPoint === this.snapPoints[2]) {
                this.closeWithAnimation();
            } else {
                Animated.spring(this.translateYOffset, {
                    velocity: velocityY,
                    tension: 68,
                    friction: 12,
                    toValue: destSnapPoint,
                    useNativeDriver: true,
                }).start(() => {
                    this.setState({lastSnap: destSnapPoint});

                    // When dragging down the panel when is fully open reset the scrollView to the top
                    if (isGoingDown && destSnapPoint !== this.snapPoints[0]) {
                        this.scrollToTop();
                    }
                });
            }
        }
    };

    onSingleTap = ({nativeEvent}: {nativeEvent: (HandlerStateChangeEventPayload & TapGestureHandlerEventPayload)}) => {
        if (nativeEvent.state === GestureState.ACTIVE) {
            this.closeWithAnimation();
        }
    };

    scrollToTop = () => {
        if (this.scrollViewRef?.current) {
            this.scrollViewRef.current.scrollTo({
                x: 0,
                y: 0,
                animated: false,
            });
        }
    };

    render() {
        const {children, header, theme} = this.props;
        const lastSnap = this.state.lastSnap || 0;

        const styles = getStyleSheet(theme);

        const translateStyle = {
            alignItems: 'center' as const,
            transform: [{translateY: this.translateY}],
        };
        const backdropStyle = {
            opacity: this.backdropOpacity,
        };

        const headerComponent = header(this.headerRef);

        return (
            <TapGestureHandler
                maxDurationMs={100000}
                ref={this.masterRef}
                maxDeltaY={lastSnap - this.snapPoints[0]}
            >
                <View
                    style={StyleSheet.absoluteFill}
                    pointerEvents='box-none'
                >
                    <TapGestureHandler
                        waitFor={this.backdropRef}
                        onHandlerStateChange={this.onSingleTap}
                    >
                        <Animated.View style={styles.viewport}>
                            <PanGestureHandler
                                simultaneousHandlers={[this.scrollRef, this.masterRef]}
                                waitFor={this.headerRef}
                                shouldCancelWhenOutside={false}
                                onGestureEvent={this.onGestureEvent}
                                onHandlerStateChange={this.onHandlerStateChange}
                                ref={this.backdropRef}
                            >

                                <Animated.View
                                    style={[styles.backdrop, backdropStyle]}
                                    pointerEvents='box-only'
                                    testID='slide_up_panel'
                                />
                            </PanGestureHandler>
                        </Animated.View>
                    </TapGestureHandler>
                    <Animated.View style={[StyleSheet.absoluteFill, translateStyle]}>
                        <PanGestureHandler
                            simultaneousHandlers={[this.scrollRef, this.masterRef]}
                            waitFor={this.headerRef}
                            shouldCancelWhenOutside={false}
                            onGestureEvent={this.onGestureEvent}
                            onHandlerStateChange={this.onHeaderHandlerStateChange}
                        >
                            <Animated.View>
                                <SlideUpPanelIndicator/>
                            </Animated.View>
                        </PanGestureHandler>
                        {headerComponent}
                        <View style={styles.wrapper}>
                            <PanGestureHandler
                                ref={this.panRef}
                                simultaneousHandlers={[this.scrollRef, this.masterRef]}
                                waitFor={this.headerRef}
                                shouldCancelWhenOutside={false}
                                onGestureEvent={this.onGestureEvent}
                                onHandlerStateChange={this.onHandlerStateChange}
                            >
                                <Animated.View style={[styles.container, !headerComponent && styles.border]}>
                                    <NativeViewGestureHandler
                                        ref={this.scrollRef}
                                        waitFor={this.masterRef}
                                        simultaneousHandlers={this.panRef}
                                    >
                                        <Animated.ScrollView
                                            ref={this.scrollViewRef}
                                            bounces={false}
                                            onScrollBeginDrag={this.onRegisterLastScroll}
                                            scrollEventThrottle={1}
                                            style={{marginBottom: (this.props.marginFromTop || 0 + BOTTOM_MARGIN)}}
                                        >
                                            {children}
                                        </Animated.ScrollView>
                                    </NativeViewGestureHandler>
                                </Animated.View>
                            </PanGestureHandler>
                        </View>
                    </Animated.View>
                </View>
            </TapGestureHandler>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        viewport: {
            flex: 1,
        },
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            flex: 1,
            maxWidth: 450,
            width: '100%',
        },
        border: {
            ...Platform.select({
                android: {
                    borderTopRightRadius: 2,
                    borderTopLeftRadius: 2,
                },
                ios: {
                    borderTopRightRadius: 10,
                    borderTopLeftRadius: 10,
                },
            }),
        },
        backdrop: {
            backgroundColor: '#000',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        },
    };
});
