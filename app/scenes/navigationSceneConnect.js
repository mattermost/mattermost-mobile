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
    renderBackButton: (props, emitter, theme) => {
        return (
            <TouchableOpacity
                style={{flexDirection: 'row', flex: 1, paddingHorizontal: 15, alignItems: 'center'}}
                onPress={props.onNavigateBack}
            >
                <Icon
                    name='angle-left'
                    size={18}
                    color={theme.sidebarHeaderTextColor}
                />
                <FormattedText
                    id='mobile.routes.back'
                    defaultMessage='Back'
                    style={{color: theme.sidebarHeaderTextColor, marginLeft: 10}}
                />
            </TouchableOpacity>
        );
    },
    renderTitleComponent: (props, emitter, theme) => {
        const navProps = props.scene.route.navigationProps || {};
        const title = navProps.title;
        if (title) {
            return (
                <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 50}}>
                    <FormattedText
                        id={title.id}
                        defaultMessage={title.defaultMessage}
                        style={{textAlign: 'center', color: theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold'}}
                    />
                </View>
            );
        }
    },
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    allowSceneSwipe: true,
    allowMenuSwipe: false
};

export default (stateProps, dispatchProps) => (WrappedComponent) => {
    const componentNavigationProps = WrappedComponent.WrappedComponent ? WrappedComponent.WrappedComponent.navigationProps : WrappedComponent.navigationProps;

    WrappedComponent.navigationProps = Object.assign({}, defaults, componentNavigationProps);

    return connect(stateProps, dispatchProps)(WrappedComponent);
};
