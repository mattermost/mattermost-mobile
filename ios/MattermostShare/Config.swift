let configurationKey = "com.apple.configuration.managed"

func getConfig() -> [String : Any] {
    return UserDefaults.standard.dictionary(forKey: configurationKey) ?? [:]
}
