---
trigger: always_on
---

# LLM API_Keys Security Guidelines

## Key Storage Location

- Gemini key: Stored in `GEMINI_API_KEY` environment variable

## Code Requirements

1. **Absolutely forbidden** to hardcode keys
2. **Must** use `os.getenv()` or similar methods to read environment variables
3. **Must** include key validation code (e.g., check if None)
4. **Recommended** to use configuration classes or functions to encapsulate API calls

## Error Handling

- If key does not exist, provide clear instructions
- Do not expose any key-related information in production code

## Example Structure

Please write code following this pattern:

```python
import os

def get_api_key(service_name):
    key = os.getenv(f"{service_name.upper()}_API_KEY")
    if not key:
        raise ValueError(f"Please set {service_name.upper()}_API_KEY in environment variables")
    return key

```

#

## 🛡️ **Multi-layer Protection Strategy**

In addition to prompts, these protections should also be implemented:

### **1. Code-level Protection**

```python
# safe_api.py - Secure encapsulation example
import os
import hashlib

class SecureAPIClient:
    def __init__(self, service_name):
        self.service_name = service_name
        self.api_key = self._load_key()

    def _load_key(self):
        """Securely load API key"""
        env_var = f"{self.service_name.upper()}_API_KEY"
        key = os.getenv(env_var)

        if not key:
            raise ValueError(
                f"Please set environment variable {env_var}\n"
                f"Example: export {env_var}='your-key-here'"
            )

        # Log key hash (for logging, without exposing key)
        key_hash = hashlib.sha256(key.encode()).hexdigest()[:8]
        print(f"[Security Notice] Loaded {self.service_name} API key (hash: ...{key_hash})")
        return key

```

### **2. Establish Environment Variable Check Script**

```python
# check_env.py - Environment variable security check
import os

REQUIRED_KEYS = ['GEMINI_API_KEY']

def check_environment():
    missing = []
    for key in REQUIRED_KEYS:
        if not os.getenv(key):
            missing.append(key)

    if missing:
        print("❌ Missing the following environment variables:")
        for key in missing:
            print(f"   - {key}")
        print("\n💡 Setup method:")
        print(f"   export {missing[0]}='your-key-here'")
        return False

    print("✅ All API keys configured properly (securely stored in environment variables)")
    return True

if __name__ == "__main__":
    check_environment()

```

### **3. API Key Existence Check**

Perform API Key existence check:

```python
print("API key loaded:", bool(os.getenv("GEMINI_API_KEY")))
```
