import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import userService, { User } from '../../services/userService';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';

interface AssignmentSelectorProps {
    onSelect: (user: User) => void;
    label?: string;
    selectedUserId?: number;
}

export const AssignmentSelector: React.FC<AssignmentSelectorProps> = ({ onSelect, label = "Assign to:", selectedUserId }) => {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (selectedUserId) {
            // Fetch user details if needed, or just display "User ID: X"
            userService.getUser(selectedUserId).then(setSelectedUser).catch(console.error);
        }
    }, [selectedUserId]);

    const fetchUsers = async (query: string) => {
        setLoading(true);
        try {
            const res = await userService.getUsers({ search: query, limit: 5 });
            setUsers(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchUsers, 500), []);

    useEffect(() => {
        if (expanded) {
            debouncedFetch(search);
        }
    }, [search, expanded, debouncedFetch]);

    const handleSelect = (user: User) => {
        setSelectedUser(user);
        onSelect(user);
        setExpanded(false);
        setSearch('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            {selectedUser && !expanded ? (
                <View style={styles.selectedContainer}>
                    <Text style={styles.selectedText}>{selectedUser.full_name || selectedUser.email}</Text>
                    <TouchableOpacity onPress={() => setExpanded(true)}>
                        <Text style={styles.changeText}>Change</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <TouchableOpacity 
                        style={styles.inputContainer} 
                        onPress={() => setExpanded(true)}
                    >
                         <TextInput
                            style={styles.input}
                            placeholder="Search user..."
                            value={search}
                            onChangeText={setSearch}
                            onFocus={() => setExpanded(true)}
                        />
                        <Ionicons name="search" size={20} color="#666" />
                    </TouchableOpacity>
                    
                    {expanded && (
                        <View style={styles.listContainer}>
                            {loading ? (
                                <ActivityIndicator size="small" color="#007bff" style={{ padding: 10 }} />
                            ) : (
                                <FlatList
                                    data={users}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.userItem} onPress={() => handleSelect(item)}>
                                            <Text style={styles.userName}>{item.full_name || 'No Name'}</Text>
                                            <Text style={styles.userEmail}>{item.email}</Text>
                                            <Text style={styles.userRole}>Role: {item.role_id}</Text>
                                        </TouchableOpacity>
                                    )}
                                    style={styles.list}
                                />
                            )}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setExpanded(false)}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    selectedContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#90caf9',
    },
    selectedText: {
        fontWeight: 'bold',
        color: '#1976d2',
    },
    changeText: {
        color: '#1976d2',
        textDecorationLine: 'underline',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        backgroundColor: 'white',
    },
    input: {
        flex: 1,
    },
    listContainer: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: 'white',
        maxHeight: 200,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 1000,
    },
    list: {
        maxHeight: 160,
    },
    userItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    userName: {
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 12,
        color: '#666',
    },
    userRole: {
        fontSize: 10,
        color: '#999',
    },
    closeButton: {
        padding: 10,
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    closeButtonText: {
        color: '#666',
    },
});
