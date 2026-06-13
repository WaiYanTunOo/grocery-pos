# Firebase Setup

This app uses Firebase Authentication with Email/Password and Cloud Firestore.

## Required Authentication Setting

If the app shows `auth/operation-not-allowed` or `PASSWORD_LOGIN_DISABLED`, enable Email/Password sign-in:

1. Open Firebase Console.
2. Select this project.
3. Go to **Authentication**.
4. Open **Sign-in method**.
5. Click **Email/Password**.
6. Enable **Email/Password**.
7. Click **Save**.
8. Refresh the app preview.

## Required Environment Variables

Keep real values only in `.env`; do not commit `.env`.

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Optional:

```bash
VITE_FIRESTORE_NAMESPACE=grocery-pos
VITE_STORE_ID=main_store
VITE_MANAGER_SETUP_CODE=
VITE_ADMIN_EMAILS=owner@example.com,manager@example.com
```

## First Admin Account

For production, the safest bootstrap is:

1. Register the first user in the app.
2. In Firestore, open `users/{uid}` for that user.
3. Set `role` to `admin`.
4. Set `storeId` to `main_store`.

After that, admin users can manage inventory and reports from the app.

The app also accepts these admin role values in Firestore:

```text
admin
administrator
owner
manager
superadmin
```

If you want specific emails to always receive admin access, add them to `VITE_ADMIN_EMAILS` and restart the app.

## Data Collections

The app stores operational data under:

```text
artifacts/grocery-pos/users/main_store/products
artifacts/grocery-pos/users/main_store/sales
artifacts/grocery-pos/users/main_store/audit_logs
users/{uid}
```
