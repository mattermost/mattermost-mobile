// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import BaseDrawer from 'react-native-drawer';

// Extends react-native-drawer to allow better control over the open/closed state from the parent
export default class Drawer extends BaseDrawer {
    static propTypes = {
        ...BaseDrawer.propTypes,
        onRequestClose: PropTypes.func.isRequired
    };

    processTapGestures = () => {
        // Note that we explicitly don't support tap to open or double tap because I didn't copy them over

        if (this._activeTween) { // eslint-disable-line no-underscore-dangle
            return false;
        }

        if (this.props.tapToClose && this._open) { // eslint-disable-line no-underscore-dangle
            this.props.onRequestClose();

            return true;
        }

        return false;
    };
}
