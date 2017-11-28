// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {wrapWithPreventDoubleTap} from 'app/utils/tap';

const SEARCH = 'search';

export default class ChannelSearchButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired
        }).isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object
    };

    handlePress = wrapWithPreventDoubleTap(async () => {
        const {actions, navigator, theme} = this.props;

        await actions.clearSearch();
        actions.handlePostDraftChanged(SEARCH, '');

        navigator.showModal({
            screen: 'Search',
            animated: true,
            backButtonTitle: '',
            overrideBackPress: true,
            navigatorStyle: {
                navBarHidden: true,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                theme
            }
        });
    });

    render() {
        const {
            theme
        } = this.props;

        return (
            <TouchableOpacity
                onPress={this.handlePress}
                style={style.container}
            >
                <View style={style.wrapper}>
                    <AwesomeIcon
                        name='search'
                        size={18}
                        color={theme.sidebarHeaderTextColor}
                    />
                </View>
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    container: {
        width: 40
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 10,
        zIndex: 30
    }
});
