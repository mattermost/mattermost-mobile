// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable */

import {connect} from 'react-redux';
import React, {PropTypes} from 'react';
import {
    Platform,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';

const defaults = {
    renderBackButton: (props) => {
        return (
            <TouchableOpacity
                style={{flexDirection: 'row', ...Platform.select({ios: {marginTop: 10}, android: {marginTop: 15}}), marginLeft: 15, alignItems: 'center'}}
                onPress={props.onNavigateBack}
            >
                <Icon
                    name='angle-left'
                    size={25}
                    color='#fff'
                />
                <FormattedText
                    id='mobile.routes.back'
                    defaultMessage='Back'
                    style={{color: '#fff', marginLeft: 10}}
                />
            </TouchableOpacity>
        );
    },
    renderTitleComponent: (props) => {
        const navProps = props.scene.route.navigationProps || {};
        const title = navProps.title;
        if (title) {
            return (
                <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 50}}>
                    <FormattedText
                        id={title.id}
                        defaultMessage={title.defaultMessage}
                        style={{color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center'}}
                    />
                </View>
            );
        }
    },
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#367FB0'
    },
    allowSwipe: false
};

export default (stateProps, dispatchProps) => (WrappedComponent) => {
    const componentNavigationProps = WrappedComponent.WrappedComponent ? WrappedComponent.WrappedComponent.navigationProps : WrappedComponent.navigationProps;

    WrappedComponent.navigationProps = Object.assign({}, defaults, componentNavigationProps);

    return connect(stateProps, dispatchProps)(WrappedComponent);
};
