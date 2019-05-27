let configurationKey = "com.apple.configuration.managed"

func getManagedConfig() -> [String : Any] {
  return UserDefaults.init(suiteName: APP_GROUP_ID)?.dictionary(forKey: configurationKey) ?? [:]
}
