import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
} from 'react-native';

const ChangePasswordScreen = () => {
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const handleChangePassword = async () => {
		if (!currentPassword || !newPassword || !confirmPassword) {
			Alert.alert('Error', 'Please fill in all fields.');
			return;
		}

		if (newPassword !== confirmPassword) {
			Alert.alert('Error', 'New password and confirmation do not match.');
			return;
		}

		setLoading(true);
		try {
			// Example API call to change password
			const response = await fetch('https://mattermost.com/user/change-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					current_password: currentPassword,
					new_password: newPassword,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				Alert.alert('Success', 'Password changed successfully!');
				setCurrentPassword('');
				setNewPassword('');
				setConfirmPassword('');
			} else {
				Alert.alert('Error', data.message || 'An error occurred.');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to change password. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Change Password</Text>
			<TextInput
				style={styles.input}
				placeholder="Current Password"
				secureTextEntry
				value={currentPassword}
				onChangeText={setCurrentPassword}
			/>
			<TextInput
				style={styles.input}
				placeholder="New Password"
				secureTextEntry
				value={newPassword}
				onChangeText={setNewPassword}
			/>
			<TextInput
				style={styles.input}
				placeholder="Confirm New Password"
				secureTextEntry
				value={confirmPassword}
				onChangeText={setConfirmPassword}
			/>
			{loading ? (
				<ActivityIndicator size="large" color="#007AFF" />
			) : (
				<TouchableOpacity style={styles.button} onPress={handleChangePassword}>
					<Text style={styles.buttonText}>Change Password</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: '#F9F9F9',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	input: {
		height: 50,
		borderColor: '#CCC',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 10,
		marginBottom: 15,
		backgroundColor: '#FFF',
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: 'center',
	},
	buttonText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: 'bold',
	},
});

export default ChangePasswordScreen;