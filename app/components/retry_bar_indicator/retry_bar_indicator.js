// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    StyleSheet,
} from 'react-native';
import FormattedText from 'app/components/formatted_text';

const {View: AnimatedView} = Animated;

export default class RetryBarIndicator extends PureComponent {
    static propTypes = {
        failed: PropTypes.bool,
    };

    state = {
        retryMessageHeight: new Animated.Value(0),
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.failed !== nextProps.failed) {
            this.toggleRetryMessage(nextProps.failed);
        }
    }

    toggleRetryMessage = (show = true) => {
        const value = show ? 38 : 0;
        Animated.timing(this.state.retryMessageHeight, {
            toValue: value,
            duration: 350,
        }).start();
    };

    render() {
        const {retryMessageHeight} = this.state;
        const refreshIndicatorDimensions = {
            height: retryMessageHeight,
        };

        return (
            <AnimatedView style={[style.refreshIndicator, refreshIndicatorDimensions]}>
                <FormattedText
                    id='mobile.retry_message'
                    defaultMessage='Refreshing messages failed. Pull up to try again.'
                    style={{color: 'white', flex: 1, fontSize: 12}}
                />
            </AnimatedView>
        );
    }
}

const style = StyleSheet.create({
    refreshIndicator: {
        alignItems: 'center',
        backgroundColor: '#fb8000',
        flexDirection: 'row',
        paddingHorizontal: 10,
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
        width: '100%',
    },
});
