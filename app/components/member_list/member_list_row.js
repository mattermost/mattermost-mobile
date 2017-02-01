import React, {PropTypes} from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const placeholder = require('assets/images/profile.jpg');

const style = StyleSheet.create({
    avatar: {
        height: 40,
        width: 40,
        borderRadius: 20
    },
    avatarContainer: {
        height: 50,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center'
    },
    away: {
        backgroundColor: '#d3b141'
    },
    container: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    displayName: {
        fontSize: 16
    },
    offline: {
        backgroundColor: 'white',
        borderColor: '#bababa'
    },
    online: {
        backgroundColor: 'green'
    },
    statusContainer: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 5,
        right: 5
    },
    textContainer: {
        flex: 1,
        flexDirection: 'row',
        marginLeft: 10
    },
    username: {
        marginLeft: 5,
        fontSize: 16,
        opacity: 0.7
    }
});

function createTouchableComponent(children, action) {
    return (
        <TouchableHighlight onPress={action}>
            {children}
        </TouchableHighlight>
    );
}

function MemberListRow(props) {
    const {id, displayName, pictureURL, username, status, onPress} = props;

    const statusToIcon = {
        away: 'minus',
        online: 'check'
    };

    let StatusComponent = null;
    if (statusToIcon[status]) {
        StatusComponent = (
            <Icon
                name={statusToIcon[status]}
                size={10}
                color='#fff'
            />
        );
    }

    const RowComponent = (
        <View style={style.container}>
            <View style={style.avatarContainer}>
                <Image
                    style={style.avatar}
                    source={{uri: pictureURL}}
                    defaultSource={placeholder}
                />
                <View style={[style.statusContainer, style[status]]}>
                    {StatusComponent}
                </View>
            </View>
            <View style={style.textContainer}>
                <Text style={style.displayName}>
                    {displayName}
                </Text>
                <Text style={style.username}>
                    {`(@${username})`}
                </Text>
            </View>
        </View>
    );

    if (typeof onPress === 'function') {
        return createTouchableComponent(RowComponent, () => onPress(id));
    }

    return RowComponent;
}

MemberListRow.propTypes = {
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    pictureURL: PropTypes.string,
    status: PropTypes.string,
    username: PropTypes.string.isRequired,
    onPress: PropTypes.func
};

MemberListRow.defaultProps = {
    status: 'offline'
};

export default MemberListRow;
