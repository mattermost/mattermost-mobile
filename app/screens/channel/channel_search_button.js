// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {clearSearch} from 'mattermost-redux/actions/search';

import {handlePostDraftChanged} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';
import {preventDoubleTap} from 'app/utils/tap';

const SEARCH = 'search';

class ChannelSearchButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired
        }).isRequired,
        applicationInitializing: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object
    };

    handlePress = async () => {
        const {actions, navigator, theme} = this.props;

        await actions.clearSearch();
        actions.handlePostDraftChanged(SEARCH, '');

        navigator.showModal({
            screen: 'Search',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarHidden: true,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                theme
            }
        });
    };

    render() {
        const {
            applicationInitializing,
            theme
        } = this.props;

        if (applicationInitializing) {
            return null;
        }

        return (
            <TouchableOpacity
                onPress={() => preventDoubleTap(this.handlePress, this)}
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

function mapStateToProps(state, ownProps) {
    return {
        applicationInitializing: state.views.root.appInitializing,
        theme: getTheme(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearSearch,
            handlePostDraftChanged
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelSearchButton);
