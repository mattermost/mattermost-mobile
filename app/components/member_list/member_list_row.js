import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';

import ProfilePicture from 'app/components/profile_picture';

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    displayName: {
        fontSize: 16
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
    const {id, displayName, username, onPress, user} = props;

    const RowComponent = (
        <View style={style.container}>
            <ProfilePicture
                user={user}
                size={40}
            />
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
    username: PropTypes.string.isRequired,
    onPress: PropTypes.func
};

export default MemberListRow;
