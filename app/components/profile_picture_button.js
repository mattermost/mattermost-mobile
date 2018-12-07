// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {Client4} from 'mattermost-redux/client';

import {t} from 'app/utils/i18n';

import ProfilePicture from 'app/components/profile_picture';
import AttachmentButton from 'app/components/attachment_button';

export default class ProfilePictureButton extends React.PureComponent {
    static propTypes = {
        currentUser: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        extraOptions: PropTypes.func
    };

    state = {
        profileImageUri: null,
    };

    getProfileImageUri = async (id, lastPictureUpdate) => {
        let uri;
        try {
            uri = await Client4.getProfilePictureUrl(id, lastPictureUpdate);
        } catch (error) {
            return null;
        }
        return this.setState({profileImageUri: uri});
    }

    isCustomProfileImage = async (id, lastPictureUpdate) => {
        let uri;
        let action = null;
        try {
            uri = await Client4.getProfilePictureUrl(id, lastPictureUpdate);
        } catch (error) {
            return null;
        }
        let {extraOptions} = this.props;
        if (typeof(extraOptions) !== 'undefined') {
            action = extraOptions;
        }

        if (uri.includes('?')) {
            this.setState({
                extraOptions:
                    {
                        action: action,
                        text: {
                            id: t('mobile.edit_profile.remove_profile_photo'),
                            defaultMessage: 'Remove Photo',
                        },
                        textStyle: {
                            color: '#CC3239',
                        },
                        icon: 'trash',
                        iconStyle: {
                            color: '#CC3239',
                        },
                    }
            });

        }
        return this.setState({isCustomProfileImage: false});
    }

    componentWillMount() {
        const {id, last_picture_update: lastPictureUpdate} = this.props.currentUser;
        this.isCustomProfileImage(id, lastPictureUpdate);
    }

    componentDidMount() {

    }

    render() {
	    const {children, ...props} = this.props;
        const {extraOptions} = this.state;

	    // Avoid passing unneeded props
	    Reflect.deleteProperty(props, 'currentUser');

        return (
            <AttachmentButton
                {...props}
                extraOptions={extraOptions}
            >
                {children}
            </AttachmentButton>
        );
    }
}