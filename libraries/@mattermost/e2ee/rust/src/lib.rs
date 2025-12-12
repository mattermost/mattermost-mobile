uniffi::setup_scaffolding!();

#[uniffi::export]
pub fn hello_from_rust() -> String {
    "Hello from Rust!".to_string()
}

#[uniffi::export]
pub fn greet(name: String) -> String {
    format!("Hello, {}! Greetings from Rust.", name)
}
