import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    StyleSheet,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import logo from 'assets/images/logo.png';

export default class SelectServerEasterEgg extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired
    }

    state = {
        error: false,
        unlockSelectServerPartOneCount: 0
    }

    handleShowSelectServerPartOne = () => {
        clearTimeout(this.selectServerPartOneTimeout);

        let duration = 2000;
        if (this.state.unlockSelectServerPartOneCount > 3) {
            duration = 10000;
        }

        this.setState((prevState) => ({unlockSelectServerPartOneCount: prevState.unlockSelectServerPartOneCount + 1}));

        this.selectServerPartOneTimeout = setTimeout(() => this.setState({unlockSelectServerPartOneCount: 0}), duration);
    }

    handleShowSelectServerPartTwo = () => {
        clearTimeout(this.selectServerPartOneTimeout);
        this.goToSelectServer();
    }

    goToSelectServer = () => {
        this.props.navigator.resetTo({
            screen: 'SelectServer',
            animated: false,
            navigatorStyle: {
                navBarHidden: true,
                navBarBackgroundColor: 'black',
                statusBarHidden: false,
                statusBarHideWithNavBar: false
            },
            passProps: {
                forceSelect: true
            }
        });
    };

    render() {
        return (
            <View style={style.container}>
                <TouchableWithoutFeedback onPress={this.handleShowSelectServerPartOne}>
                    <View style={style.element}/>
                </TouchableWithoutFeedback>
                <View style={style.element}>
                    {this.state.unlockSelectServerPartOneCount > 4 &&
                        <TouchableWithoutFeedback onLongPress={this.handleShowSelectServerPartTwo}>
                            <Image
                                source={logo}
                                style={style.element}
                            />
                        </TouchableWithoutFeedback>
                    }
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    element: {
        height: 50,
        width: 50
    }
});
