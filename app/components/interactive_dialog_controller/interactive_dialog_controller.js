// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';

export default class InteractiveDialogController extends PureComponent {
    static propTypes = {
        triggerId: PropTypes.string,
        dialog: PropTypes.object,
        navigator: PropTypes.object,
        theme: PropTypes.object,
    };

    componentDidUpdate(prevProps) {
        const triggerId = this.props.triggerId;
        if (prevProps.triggerId === triggerId) {
            return;
        }

        const dialogData = this.props.dialog;
        if (dialogData.trigger_id !== triggerId) {
            return;
        }

        if (!dialogData.trigger_id || !dialogData.dialog) {
            return;
        }

        const theme = this.props.theme;

        this.props.navigator.push({
            backButtonTitle: '',
            screen: 'InteractiveDialog',
            title: dialogData.dialog.title,
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            navigatorButtons: {
                rightButtons: [
                    {
                        id: 'submit-dialog',
                        showAsAction: 'always',
                        title: dialogData.dialog.submit_label,
                    },
                ],
            },
        });
    }

    render() {
        return null;
    }
}
