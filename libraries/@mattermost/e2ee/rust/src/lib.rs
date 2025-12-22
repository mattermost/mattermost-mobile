uniffi::setup_scaffolding!();

#[uniffi::export]
pub fn hello_from_rust() -> String {
    "Hello from Rust!".to_string()
}

#[uniffi::export]
pub fn greet(name: String) -> String {
    format!("Hello, {}! Greetings from Rust.", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hello_from_rust() {
        assert_eq!(hello_from_rust(), "Hello from Rust!");
    }

    #[test]
    fn test_greet() {
        assert_eq!(
            greet("World".to_string()),
            "Hello, World! Greetings from Rust."
        );
    }
}
