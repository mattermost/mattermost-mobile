// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

import {emptyFunction} from 'app/utils/general';

function withLayout(WrappedComponent) {
    return class WithLayoutComponent extends PureComponent {
        static propTypes = {
            index: PropTypes.number.isRequired,
            onLayoutCalled: PropTypes.func,
            shouldCallOnLayout: PropTypes.bool,
        };

        static defaultProps = {
            onLayoutCalled: emptyFunction,
        };

        onLayout = (event) => {
            const {height} = event.nativeEvent.layout;
            const {shouldCallOnLayout} = this.props;
            if (shouldCallOnLayout) {
                this.props.onLayoutCalled(this.props.index, height);
            }
        };

        render() {
            return (
                <View onLayout={this.onLayout}>
                    <WrappedComponent {...this.props}/>
                </View>
            );
        }
    };
}

export default withLayout;
