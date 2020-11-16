let configurationKey = "com.apple.configuration.managed"

func getManagedConfig() -> [String : Any] {
  let appGroupId = Bundle.main.infoDictionary!["AppGroupIdentifier"] as! String
  return UserDefaults.init(suiteName: appGroupId)?.dictionary(forKey: configurationKey) ?? [:]
}
