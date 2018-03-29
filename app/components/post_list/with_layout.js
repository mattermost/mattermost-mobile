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
        }

        onLayout = (event) => {
            const {height} = event.nativeEvent.layout;
            this.props.onLayoutCalled(this.props.index, height);
        };

        render() {
            const {index, onLayoutCalled, shouldCallOnLayout, ...otherProps} = this.props; //eslint-disable-line no-unused-vars

            if (shouldCallOnLayout) {
                return (
                    <View onLayout={this.onLayout}>
                        <WrappedComponent {...otherProps}/>
                    </View>
                );
            }

            return <WrappedComponent {...otherProps}/>;
        }
    };
}

export default withLayout;
