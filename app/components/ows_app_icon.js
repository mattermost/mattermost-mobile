import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import { Image } from 'react-native';
import logo from 'assets/images/logo.png';

export default class AppIcon extends PureComponent {
    static propTypes = {
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        color: PropTypes.string.isRequired,
    };

    render() {
        return (
            <Image
                style={{ width: this.props.width, height: this.props.height }}
                source={logo}
            />
        );
    }
}
