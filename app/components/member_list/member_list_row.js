import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import ProfilePicture from 'app/components/profile_picture';

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 65,
        paddingHorizontal: 10,
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
    },
    selector: {
        height: 28,
        width: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#888',
        alignItems: 'center',
        justifyContent: 'center'
    },
    selectorContainer: {
        height: 50,
        paddingRight: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    selectorFilled: {
        backgroundColor: '#378FD2',
        borderWidth: 0
    }
});

function createTouchableComponent(children, action) {
    return (
        <TouchableOpacity onPress={action}>
            {children}
        </TouchableOpacity>
    );
}

function MemberListRow(props) {
    const {id, displayName, username, onPress, user} = props;

    const RowComponent = (
        <View style={style.container}>
            {props.selectable &&
                <TouchableWithoutFeedback onPress={props.onRowSelect}>
                    <View style={style.selectorContainer}>
                        <View style={[style.selector, (props.selected && style.selectorFilled)]}>
                            {props.selected &&
                                <Icon
                                    name='check'
                                    size={16}
                                    color='#fff'
                                />
                            }
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            }
            <ProfilePicture
                user={user}
                size={40}
            />
            <View style={style.textContainer}>
                <View style={{flexGrow: 1, flexDirection: 'column'}}>
                    <Text style={style.displayName}>
                        {displayName}
                    </Text>
                </View>
                <View style={{flexShrink: 1, flexDirection: 'column', flexWrap: 'wrap'}}>
                    <Text
                        style={style.username}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {`(@${username})`}
                    </Text>
                </View>
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
    onPress: PropTypes.func,
    selectable: PropTypes.bool,
    onRowSelect: PropTypes.func,
    selected: PropTypes.bool
};

export default MemberListRow;
