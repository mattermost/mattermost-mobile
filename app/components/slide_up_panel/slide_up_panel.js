// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    PanResponder,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import {DeviceTypes} from 'app/constants';

import SlideUpPanelIndicator from './slide_up_panel_indicator';

export const BOTTOM_MARGIN = DeviceTypes.IS_IPHONE_X ? 24 : 0;
const TOP_IOS_MARGIN = DeviceTypes.IS_IPHONE_X ? 84 : 64;
const TOP_ANDROID_MARGIN = 44;
const TOP_MARGIN = Platform.OS === 'ios' ? TOP_IOS_MARGIN : TOP_ANDROID_MARGIN;
const CONTAINER_MARGIN = TOP_MARGIN - 10;

export default class SlideUpPanel extends PureComponent {
    static propTypes = {
        allowStayMiddle: PropTypes.bool,
        alwaysCaptureContainerMove: PropTypes.bool,
        containerHeight: PropTypes.number,
        children: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.node),
            PropTypes.node,
        ]).isRequired,
        headerHeight: PropTypes.number,
        initialPosition: PropTypes.number,
        marginFromTop: PropTypes.number,
        onRequestClose: PropTypes.func,
    };

    static defaultProps = {
        allowStayMiddle: true,
        headerHeight: 0,
        initialPosition: 0.5,
        marginFromTop: TOP_MARGIN,
        onRequestClose: () => true,
    };

    constructor(props) {
        super(props);

        const initialUsedSpace = Math.abs(props.initialPosition);
        let initialPosition;
        if (initialUsedSpace <= 1) {
            initialPosition = ((props.containerHeight - (props.headerHeight + BOTTOM_MARGIN)) * (1 - initialUsedSpace));
        } else {
            initialPosition = ((props.containerHeight - (props.headerHeight + BOTTOM_MARGIN)) - initialUsedSpace);
        }

        this.mainPanGesture = PanResponder.create({
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
                if (this.props.alwaysCaptureContainerMove) {
                    return gestureState.dy !== 0;
                }
                const isGoingDown = gestureState.y0 < gestureState.dy;
                return this.isAValidMovement(gestureState.dx, gestureState.dy, isGoingDown);
            },
            onPanResponderMove: (evt, gestureState) => {
                const isGoingDown = gestureState.dy > 0;
                if (this.props.alwaysCaptureContainerMove &&
                    !this.isAValidMovement(gestureState.dx, gestureState.dy, isGoingDown)) {
                    return;
                }

                this.moveStart(gestureState);
            },
            onPanResponderRelease: (evt, gestureState) => {
                this.moveFinished(gestureState);
            },
        });

        this.secondaryPanGesture = PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const isGoingDown = gestureState.y0 < gestureState.dy;
                return this.isAValidMovement(gestureState.dx, gestureState.dy, isGoingDown, true);
            },
            onPanResponderMove: (evt, gestureState) => {
                this.moveStart(gestureState);
            },
            onPanResponderRelease: (evt, gestureState) => {
                this.moveFinished(gestureState);
            },
        });

        this.previousTop = initialPosition;
        this.canDrag = true;

        this.state = {
            position: new Animated.Value(props.containerHeight),
            initialPosition,
            finalPosition: props.marginFromTop,
            endPosition: 0,
        };
    }

    componentDidMount() {
        this.startAnimation(this.props.containerHeight, this.state.initialPosition, false, true);
    }

    handleTouchEnd = () => {
        if (!this.isDragging) {
            this.startAnimation(this.state.endPosition, this.props.containerHeight, false, true);
        }
    };

    isAValidMovement = (distanceX, distanceY, isGoingDown, forceCheck = false) => {
        const {endPosition, finalPosition} = this.state;

        if (finalPosition !== endPosition || forceCheck || (isGoingDown && this.canDrag)) {
            const moveTravelledFarEnough = Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 2;
            return moveTravelledFarEnough;
        }

        return false;
    };

    moveStart = (gestureState) => {
        if (this.viewRef && this.backdrop) {
            const {endPosition} = this.state;
            const position = endPosition - (gestureState.y0 - gestureState.moveY);
            this.isDragging = true;

            this.backdrop.setNativeProps({pointerEvents: 'none'});
            this.updatePosition(position);
        }
    };

    moveFinished = (gestureState) => {
        if (this.viewRef) {
            const isGoingDown = gestureState.y0 < gestureState.moveY;
            let position = gestureState.moveY;
            if (this.previousTop !== position) {
                position = this.previousTop;
            }

            this.startAnimation(gestureState.y0, position, isGoingDown);
        }
    };

    setBackdropRef = (ref) => {
        this.backdrop = ref;
    };

    setDrag = (val) => {
        this.canDrag = val;
    };

    setViewRef = (ref) => {
        this.viewRef = ref;
    };

    startAnimation = (initialY, positionY, isGoingDown, initial = false) => {
        const {allowStayMiddle, containerHeight, onRequestClose} = this.props;
        const {finalPosition, initialPosition} = this.state;
        const position = new Animated.Value(initial ? initialY : positionY);
        let endPosition = (!isGoingDown && !initial ? finalPosition : positionY);

        position.removeAllListeners();
        if (isGoingDown) {
            if (positionY <= this.state.initialPosition && allowStayMiddle) {
                endPosition = initialPosition;
            } else {
                endPosition = containerHeight;
            }
        }

        Animated.timing(position, {
            toValue: endPosition,
            duration: initial ? 200 : 100,
            useNativeDriver: true,
        }).start(() => {
            if (this.viewRef && this.backdrop) {
                this.setState({endPosition});
                this.backdrop.setNativeProps({pointerEvents: 'box-only'});
                this.isDragging = false;

                if (endPosition === containerHeight) {
                    onRequestClose();
                }
            }
        });

        position.addListener((pos) => {
            if (this.viewRef) {
                this.updatePosition(pos.value);
            }
        });
    };

    updatePosition = (newPosition) => {
        const {position} = this.state;
        this.previousTop = newPosition;
        position.setValue(newPosition);
    };

    render() {
        const {children} = this.props;
        const containerPosition = {
            top: this.state.position,
        };

        return (
            <View style={styles.viewport}>
                <View
                    ref={this.setBackdropRef}
                    style={styles.backdrop}
                    pointerEvents='box-only'
                    onTouchEnd={this.handleTouchEnd}
                    {...this.secondaryPanGesture.panHandlers}
                />
                <SlideUpPanelIndicator
                    containerPosition={containerPosition}
                    panHandlers={this.secondaryPanGesture.panHandlers}
                />
                <Animated.View
                    ref={this.setViewRef}
                    style={[containerPosition, styles.container]}
                    {...this.mainPanGesture.panHandlers}
                >
                    <View style={{maxHeight: (this.props.containerHeight - this.props.headerHeight - CONTAINER_MARGIN)}}>
                        {children}
                    </View>
                </Animated.View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    viewport: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'white',
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
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
});
