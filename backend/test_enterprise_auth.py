import sys
import os
import json
import urllib.request
import urllib.parse

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def post_json(path, data, token=None):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(path, token=None):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_auth():
    print("=== Testing Enterprise Authentication & Roles ===")
    # 1. Admin Login (Single Administrator: Suhailah Desa)
    admin_login = post_json("/api/auth/login", {
        "email": "admin@loomi.com",
        "password": "password123"
    })
    assert admin_login["status"] == "success"
    admin_token = admin_login["token"]
    admin_user = admin_login["user"]
    assert admin_user["role"] == "admin"
    assert admin_user["name"] == "Suhailah Desa"
    print(f"✓ Admin login successful: {admin_user['name']} ({admin_user['role']})")

    # 2. Registered User Login
    user_login = post_json("/api/auth/login", {
        "email": "suhailahsyazwani1@gmail.com",
        "password": "password123"
    })
    assert user_login["status"] == "success"
    user_token = user_login["token"]
    user_obj = user_login["user"]
    assert user_obj["role"] == "user"
    print(f"✓ Registered user login successful: {user_obj['name']} ({user_obj['role']})")

    # 3. Test /api/auth/me with tokens
    me_admin = get_json("/api/auth/me", token=admin_token)
    assert me_admin["email"] == "admin@loomi.com"
    assert me_admin["name"] == "Suhailah Desa"
    print("✓ Authenticated /api/auth/me verified for Admin")

    me_user = get_json("/api/auth/me", token=user_token)
    assert me_user["email"] == "suhailahsyazwani1@gmail.com"
    print("✓ Authenticated /api/auth/me verified for Registered User")

    # 4. Test /api/employees directory (requires admin token)
    employees = get_json("/api/employees", token=admin_token)
    assert isinstance(employees, list)
    print(f"✓ Employees/Participants directory verified: {len(employees)} entries registered")

    # 5. Test /api/sessions list (requires admin token)
    sessions = get_json("/api/sessions", token=admin_token)
    assert isinstance(sessions, list)
    print(f"✓ Admin Live Sessions registry verified: {len(sessions)} sessions listed")

    print("\n🎉 ALL PHASE 3 BACKEND AUTH & EMPLOYEE SUITES PASSED! 🎉\n")

if __name__ == "__main__":
    test_auth()
