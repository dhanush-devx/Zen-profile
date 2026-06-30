use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_default: bool,
    pub avatar: Option<String>,
}
