// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableOpacity,
    View
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

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
            }
        });
    });

    render() {
        const {
            theme
        } = this.props;

        const style = getStyle(theme);

        return (
            <View style={style.container}>
                <TouchableOpacity
                    onPress={this.handlePress}
                    style={style.flex}
                >
                    <View style={style.wrapper}>
                        <AwesomeIcon
                            name='search'
                            size={18}
                            style={style.icon}
                        />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: 40,
            zIndex: 45
        },
        flex: {
            flex: 1
        },
        wrapper: {
            alignItems: 'flex-end',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center'
        },
        icon: {
            backgroundColor: theme.sidebarHeaderBg,
            color: theme.sidebarHeaderTextColor
        }
    };
});
