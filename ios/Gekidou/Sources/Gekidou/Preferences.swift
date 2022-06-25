//
//  File.swift
//  
//
//  Created by Elias Nahum on 26-06-22.
//

import Foundation

let appGroupId = Bundle.main.infoDictionary!["AppGroupIdentifier"] as? String

public class Preferences: NSObject {
    private let userDefauls = UserDefaults(suiteName: appGroupId)
    
    @objc public static let `default` = Preferences()
    
    override private init() {}
    
    public func object(forKey name: String) -> Any? {
        return userDefauls?.object(forKey: name)
    }
    
    public func removeObject(forKey name: String) {
        userDefauls?.removeObject(forKey: name)
    }
    
    public func set(_ value: Any?, forKey key: String) {
        userDefauls?.set(value, forKey: key)
    }
}
