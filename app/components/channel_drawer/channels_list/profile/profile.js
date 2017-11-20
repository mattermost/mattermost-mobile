// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    View,
    TouchableOpacity,
    StyleSheet
} from 'react-native';

import {NavigationTypes} from 'app/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {General} from 'mattermost-redux/constants';
import ProfilePicture from 'app/components/profile_picture';
const PROFILE_PICTURE_SIZE = 32;

class Profile extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            setStatus: PropTypes.func.isRequired
        }).isRequired,
        currentUser: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        intl: intlShape.isRequired
    };

    setStatus = (status) => {
        const {currentUser: {id: currentUserId}} = this.props;
        this.props.actions.setStatus({
            user_id: currentUserId,
            status
        });
        EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
    };

    setOnline = () => {
        const items = [{
            action: () => this.setStatus(General.ONLINE),
            text: {
                id: 'mobile.set_status.online',
                defaultMessage: 'Online'
            }
        }, {
            action: () => this.setStatus(General.AWAY),
            text: {
                id: 'mobile.set_status.away',
                defaultMessage: 'Away'
            }
        }, {
            action: () => this.setStatus(General.DND),
            text: {
                id: 'mobile.set_status.dnd',
                defaultMessage: 'Do Not Disturb'
            }
        }, {
            action: () => this.setStatus(General.OFFLINE),
            text: {
                id: 'mobile.set_status.offline',
                defaultMessage: 'Offline'
            }
        }];

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                items
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext'
            }
        });
    };

    render() {
        const {currentUser: {id: currentUserId}} = this.props;
        return (
            <TouchableOpacity
                onPress={this.setOnline}
            >
                <View style={styles.profile}>
                    <ProfilePicture
                        userId={currentUserId}
                        size={PROFILE_PICTURE_SIZE}
                    />
                </View>
            </TouchableOpacity>
        );
    }
}

const styles = StyleSheet.create({
    profile: {
        marginRight: 8
    }
});

export default injectIntl(Profile);
