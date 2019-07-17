// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export default class InteractiveDialogController extends PureComponent {
    static propTypes = {
        triggerId: PropTypes.string,
        dialog: PropTypes.object,
        navigator: PropTypes.object,
        theme: PropTypes.object,
    };

    constructor(props) {
        super(props);

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    componentDidUpdate(prevProps) {
        const triggerId = this.props.triggerId;
        if (!triggerId) {
            return;
        }

        const dialogData = this.props.dialog || {};
        const prevDialogData = prevProps.dialog || {};
        if (prevProps.triggerId === triggerId && dialogData.trigger_id === prevDialogData.trigger_id) {
            return;
        }

        if (dialogData.trigger_id !== triggerId) {
            return;
        }

        if (!dialogData.trigger_id || !dialogData.dialog) {
            return;
        }

        const theme = this.props.theme;

        this.props.navigator.showModal({
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
                leftButtons: [{
                    id: 'close-dialog',
                    icon: this.closeButton,
                }],
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
