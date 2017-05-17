// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import RNBottomSheet from 'react-native-bottom-sheet';

export default class OptionsContext extends PureComponent {
    static propTypes = {
        actions: PropTypes.array,
        cancelText: PropTypes.string
    };

    static defaultProps = {
        actions: [],
        cancelText: 'Cancel'
    };

    show = () => {
        const {actions, cancelText} = this.props;
        if (actions.length) {
            const actionsText = actions.map((a) => a.text);
            RNBottomSheet.showBottomSheetWithOptions({
                options: [...actionsText, cancelText],
                cancelButtonIndex: actions.length
            }, (value) => {
                if (value !== actions.length) {
                    const selectedOption = actions[value];
                    if (selectedOption && selectedOption.onPress) {
                        selectedOption.onPress();
                    }
                }
            });
        }
    };

    render() {
        return null;
    }
}
