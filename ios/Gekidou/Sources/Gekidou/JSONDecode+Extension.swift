//
//  JSONDecode+Extension.swift
//

import Foundation

// Inspired by https://gist.github.com/loudmouth/332e8d89d8de2c1eaf81875cfcd22e24
// Used to decode dictionaries and array of dictionaries

struct JSONCodingKeys: CodingKey {
    var stringValue: String
    var intValue: Int?

    init(stringValue: String) {
        self.stringValue = stringValue
    }

    init?(intValue: Int) {
        self.init(stringValue: "\(intValue)")
        self.intValue = intValue
    }
}

extension KeyedDecodingContainer {

    func decode(_ type: [String: Any].Type, forKey key: K) throws -> [String: Any] {
        let container = try self.nestedContainer(keyedBy: JSONCodingKeys.self, forKey: key)
        return try container.decode(type)
    }

    func decodeIfPresent(_ type: [String: Any].Type, forKey key: K) throws -> [String: Any]? {
        guard contains(key) else {
            return nil
        }
        return try decode(type, forKey: key)
    }

    func decode(_ type: [Any].Type, forKey key: K) throws -> [Any] {
        var container = try self.nestedUnkeyedContainer(forKey: key)
        return try container.decode(type)
    }

    func decode(_ type: [[String: Any]].Type, forKey key: K) throws -> [[String: Any]] {
        var container = try self.nestedUnkeyedContainer(forKey: key)
        return try container.decode(type)
    }

    func decodeIfPresent(_ type: [Any].Type, forKey key: K) throws -> [Any]? {
        guard contains(key) else {
            return nil
        }
        return try decode(type, forKey: key)
    }

    func decode(_ type: [String: Any].Type) throws -> [String: Any] {
        var dictionary = [String: Any]()

        for key in allKeys {
            if let boolValue = try? decode(Bool.self, forKey: key) {
                dictionary[key.stringValue] = boolValue
            } else if let intValue = try? decode(Int.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(Int8.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(Int16.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(Int32.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(Int64.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(UInt.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(UInt8.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(UInt16.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(UInt32.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let intValue = try? decode(UInt64.self, forKey: key) {
                dictionary[key.stringValue] = intValue
            } else if let doubleValue = try? decode(Float.self, forKey: key) {
                dictionary[key.stringValue] = doubleValue
            } else if let doubleValue = try? decode(Double.self, forKey: key) {
                dictionary[key.stringValue] = doubleValue
            } else if let stringValue = try? decode(String.self, forKey: key) {
                dictionary[key.stringValue] = stringValue
            } else if let nestedDictionary = try? decode(Dictionary<String, Any>.self, forKey: key) {
                dictionary[key.stringValue] = nestedDictionary
            } else if let nestedArray = try? decode(Array<Any>.self, forKey: key) {
                dictionary[key.stringValue] = nestedArray
            } else if let value = try? decodeNil(forKey: key), value {
                //saving NSNull values in a dictionary will produce unexpected results for users, just skip
            }
        }
        return dictionary
    }
    
    func decodeIfPresent<T: Decodable>(forKey key: K, defaultValue: T) -> T {
        do {
            //below will throw
            return try self.decodeIfPresent(T.self, forKey: key) ?? defaultValue
        } catch {
            return defaultValue
        }
    }

}

extension UnkeyedDecodingContainer {

    mutating func decode(_ type: [[String: Any]].Type) throws -> [[String: Any]] {
        var array: [[String: Any]] = []
        while isAtEnd == false {
            if let nestedDictionary = try? decode(Dictionary<String, Any>.self) {
                array.append(nestedDictionary)
            }
        }
        return array
    }

    mutating func decode(_ type: [Any].Type) throws -> [Any] {
        var array: [Any] = []
        while isAtEnd == false {
            if let value = try? decode(Bool.self) {
                array.append(value)
            } else if let value = try? decode(Int.self) {
                array.append(value)
            } else if let value = try? decode(Int8.self) {
                array.append(value)
            } else if let value = try? decode(Int16.self) {
                array.append(value)
            } else if let value = try? decode(Int32.self) {
                array.append(value)
            } else if let value = try? decode(Int64.self) {
                array.append(value)
            } else if let value = try? decode(UInt.self) {
                array.append(value)
            } else if let value = try? decode(UInt16.self) {
                array.append(value)
            } else if let value = try? decode(UInt32.self) {
                array.append(value)
            } else if let value = try? decode(UInt64.self) {
                array.append(value)
            } else if let value = try? decode(Float.self) {
                array.append(value)
            } else if let value = try? decode(Double.self) {
                array.append(value)
            } else if let value = try? decode(String.self) {
                array.append(value)
            } else if let nestedDictionary = try? decode(Dictionary<String, Any>.self) {
                array.append(nestedDictionary)
            } else if let nestedArray = try? decodeNestedArray(Array<Any>.self) {
                array.append(nestedArray)
            } else if let value = try? decodeNil(), value {
                array.append(NSNull()) //unavoidable, but should be fine. We return [Any]. An overload to return homegenous array would be nice.
            } else {
                //if the right type is not found, it will get stuck in an infinite loop, throw, we can't handle it
                throw EncodingError.invalidValue("<UNKNOWN TYPE>", EncodingError.Context(codingPath: codingPath, debugDescription: "<UNKNOWN TYPE>"))
            }
        }
        
        return array
    }
    
    mutating func decodeNestedArray(_ type: [Any].Type) throws -> [Any] {
        // throws: `CocoaError.coderTypeMismatch` if the encountered stored value is not an unkeyed container.
        var nestedContainer = try self.nestedUnkeyedContainer()
        return try nestedContainer.decode(Array<Any>.self)
    }

    mutating func decode(_ type: [String: Any].Type) throws -> [String: Any] {
        // throws: `CocoaError.coderTypeMismatch` if the encountered stored value is not a keyed container.
        let nestedContainer = try self.nestedContainer(keyedBy: JSONCodingKeys.self)
        return try nestedContainer.decode(type)
    }
}

extension KeyedEncodingContainerProtocol where Key == JSONCodingKeys {
    
    mutating func encode(_ value: [String: Any]) throws {
        for (key, value) in value {
            let key = JSONCodingKeys(stringValue: key)
            switch value {
            case let value as Bool:
                try encode(value, forKey: key)
            case let value as Int:
                try encode(value, forKey: key)
            case let value as Int8:
                try encode(value, forKey: key)
            case let value as Int16:
                try encode(value, forKey: key)
            case let value as Int32:
                try encode(value, forKey: key)
            case let value as Int64:
                try encode(value, forKey: key)
            case let value as UInt:
                try encode(value, forKey: key)
            case let value as UInt8:
                try encode(value, forKey: key)
            case let value as UInt16:
                try encode(value, forKey: key)
            case let value as UInt32:
                try encode(value, forKey: key)
            case let value as UInt64:
                try encode(value, forKey: key)
            case let value as Float:
                try encode(value, forKey: key)
            case let value as Double:
                try encode(value, forKey: key)
            case let value as String:
                try encode(value, forKey: key)
            case let value as [String: Any]:
                try encode(value, forKey: key)
            case let value as [Any]:
                try encode(value, forKey: key)
            case is NSNull:
                try encodeNil(forKey: key)
            case Optional<Any>.none:
                try encodeNil(forKey: key)
            default:
                throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: codingPath + [key], debugDescription: "Invalid JSON value"))
            }
        }
    }
}

extension KeyedEncodingContainerProtocol {
    mutating func encode(_ value: [String: Any]?, forKey key: Key) throws {
        guard let value = value else { return }
        
        var container = nestedContainer(keyedBy: JSONCodingKeys.self, forKey: key)
        try container.encode(value)
    }
    
    mutating func encode(_ value: [Any]?, forKey key: Key) throws {
        guard let value = value else { return }
        
        var container = nestedUnkeyedContainer(forKey: key)
        try container.encode(value)
    }
}

extension UnkeyedEncodingContainer {
    
    mutating func encode(_ value: [Any]) throws {
        for (index, value) in value.enumerated() {
            switch value {
            case let value as Bool:
                try encode(value)
            case let value as Int:
                try encode(value)
            case let value as Int8:
                try encode(value)
            case let value as Int16:
                try encode(value)
            case let value as Int32:
                try encode(value)
            case let value as Int64:
                try encode(value)
            case let value as UInt:
                try encode(value)
            case let value as UInt8:
                try encode(value)
            case let value as UInt16:
                try encode(value)
            case let value as UInt32:
                try encode(value)
            case let value as UInt64:
                try encode(value)
            case let value as Float:
                try encode(value)
            case let value as Double:
                try encode(value)
            case let value as String:
                try encode(value)
            case let value as [String: Any]:
                try encode(value)
            case let value as [Any]:
                try encodeNestedArray(value)
            case is NSNull:
                try encodeNil()
            case Optional<Any>.none:
                try encodeNil()
            default:
                let keys = JSONCodingKeys(intValue: index).map({ [ $0 ] }) ?? []
                throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: codingPath + keys, debugDescription: "Invalid JSON value"))
            }
        }
    }
    
    mutating func encode(_ value: [String: Any]) throws {
        var container = nestedContainer(keyedBy: JSONCodingKeys.self)
        try container.encode(value)
    }
    
    mutating func encodeNestedArray(_ value: [Any]) throws {
        var container = nestedUnkeyedContainer()
        try container.encode(value)
    }
}
