// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export default class InteractiveDialogController extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            showModal: PropTypes.func.isRequired,
        }).isRequired,
        triggerId: PropTypes.string,
        dialog: PropTypes.object,
        theme: PropTypes.object,
    };

    constructor(props) {
        super(props);

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    componentDidUpdate(prevProps) {
        const {actions, triggerId} = this.props;
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

        const screen = 'InteractiveDialog';
        const title = dialogData.dialog.title;
        const passProps = {};
        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-dialog',
                    icon: this.closeButton,
                }],
                rightButtons: [{
                    id: 'submit-dialog',
                    showAsAction: 'always',
                    text: dialogData.dialog.submit_label,
                }],
            },
        };

        actions.showModal(screen, title, passProps, options);
    }

    render() {
        return null;
    }
}
