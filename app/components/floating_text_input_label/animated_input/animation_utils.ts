// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Animated, {EasingNode, Value, block, clockRunning, cond, not, set, startClock, stopClock, timing as retiming} from 'react-native-reanimated';

type AnimationState = {
    finished: Value<number>;
    frameTime: Value<number>;
    position: Value<number>;
    time: Value<number>;
}

type AnimationConfig = Animated.TimingConfig &{
    duration: number;
    easing: Animated.EasingNodeFunction;
    toValue: Value<number>;
};

type AnimationTiming = {
    clock: Animated.Clock;
    animation: Value<number>;
    duration?: number;
    from?: number;
    to?: number;
    easing?: Animated.EasingNodeFunction;
}

type AnimateArgs = {
    clock: Animated.Clock;
    config: Animated.TimingConfig;
    fn: typeof retiming;
    from: number;
    state: AnimationState;
}

export const timingAnimation = (params: AnimationTiming) => {
    const {clock, easing, duration, from, to} = {
        duration: 250,
        easing: EasingNode.linear,
        from: 0,
        to: 1,
        ...params,
    };

    const state: AnimationState = {
        finished: new Value(0),
        frameTime: new Value(0),
        position: new Value(0),
        time: new Value(0),
    };

    const config: AnimationConfig = {
        toValue: new Value(0),
        duration,
        easing,
    };

    return block([
        onInit(clock, [set(config.toValue, to), set(state.frameTime, 0)]),
        animate({
            clock,
            fn: retiming,
            state,
            config,
            from,
        }),
    ]);
};

const animate = ({fn, clock, state, config, from}: AnimateArgs) =>
    block([
        onInit(clock, [
            set(state.finished, 0),
            set(state.time, 0),
            set(state.position, from),
            startClock(clock),
        ]),
        fn(clock, state, config),
        cond(state.finished, stopClock(clock)),
        state.position,
    ]);

const onInit = (clock: Animated.Clock, sequence: Array<Animated.Node<number>>) => cond(not(clockRunning(clock)), sequence);
