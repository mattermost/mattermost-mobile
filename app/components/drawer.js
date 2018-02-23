// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Keyboard, Dimensions} from 'react-native';
import PropTypes from 'prop-types';
import BaseDrawer from 'react-native-drawer';

// Extends react-native-drawer to allow better control over the open/closed state from the parent
export default class Drawer extends BaseDrawer {
    static propTypes = {
        ...BaseDrawer.propTypes,
        onRequestClose: PropTypes.func.isRequired,
        bottomPanOffset: PropTypes.number,
        topPanOffset: PropTypes.number,
    };

    constructor(props) {
        super(props);

        this.keyboardHeight = 0;
    }

    componentDidMount() {
        Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
        Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
    }

    componentWillUnmount() {
        Keyboard.removeListener('keyboardDidShow', this.keyboardDidShow);
        Keyboard.removeListener('keyboardDidHide', this.keyboardDidHide);
    }

    getMainHeight = () => '100%';

    keyboardDidShow = (e) => {
        this.keyboardHeight = e.endCoordinates.height;
    };

    keyboardDidHide = () => {
        this.keyboardHeight = 0;
    };

    isOpened = () => {
        return this._open; //eslint-disable-line no-underscore-dangle
    };

    processTapGestures = () => {
        // Note that we explicitly don't support tap to open or double tap because I didn't copy them over

        if (this._activeTween) { //eslint-disable-line no-underscore-dangle
            return false;
        }

        if (this.props.tapToClose && this._open) { //eslint-disable-line no-underscore-dangle
            this.props.onRequestClose();

            return true;
        }

        return false;
    };

    testPanResponderMask = (e) => {
        if (this.props.disabled) {
            return false;
        }

        // Disable if parent or child drawer exist and are open
        if (this.context.drawer && this.context.drawer._open) { //eslint-disable-line no-underscore-dangle
            return false;
        }

        if (this._childDrawer && this._childDrawer._open) { //eslint-disable-line no-underscore-dangle
            return false;
        }

        const topPanOffset = this.props.topPanOffset || 0;
        const bottomPanOffset = this.props.bottomPanOffset || 0;
        const height = Dimensions.get('window').height;
        if ((this.props.topPanOffset && e.nativeEvent.pageY < topPanOffset) ||
            (this.props.bottomPanOffset && e.nativeEvent.pageY > (height - (bottomPanOffset + this.keyboardHeight)))) {
            return false;
        }

        const pos0 = this.isLeftOrRightSide() ? e.nativeEvent.pageX : e.nativeEvent.pageY;
        const deltaOpen = this.isLeftOrTopSide() ? this.getDeviceLength() - pos0 : pos0;
        const deltaClose = this.isLeftOrTopSide() ? pos0 : this.getDeviceLength() - pos0;

        if (this._open && deltaOpen > this.getOpenMask()) { //eslint-disable-line no-underscore-dangle
            return false;
        }

        if (!this._open && deltaClose > this.getClosedMask()) { //eslint-disable-line no-underscore-dangle
            return false;
        }

        return true;
    };
}
