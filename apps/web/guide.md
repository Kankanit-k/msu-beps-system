# Template Configuration Guide

Follow this guide when using this template for a new project to ensure the `basePath` and **Login/Authentication** are correctly configured.

## 1. Changing the Base Path

If your project is hosted in a subdirectory (e.g., `/car` instead of `/digitalplan`), you must update **two** files:

### **A. [next.config.ts](file:///Users/thanadolsingkhornart/Downloads/all_project/mui_template/next.config.ts)**

Update the `basePath` property:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/car', // <-- Change this to your project path
  trailingSlash: true
}
```

### **B. [src/components/ClientProviders.tsx](file:///Users/thanadolsingkhornart/Downloads/all_project/mui_template/src/components/ClientProviders.tsx)**

Update the `SessionProvider` base path for NextAuth:

```typescript
<SessionProvider basePath='/car/api/auth'> // <-- Match the path here
```

---

## 2. Authentication Configuration (ERP MSU)

Authentication settings are located in **[src/libs/ErpAuth.ts](file:///Users/thanadolsingkhornart/Downloads/all_project/mui_template/src/libs/ErpAuth.ts)**.

### **Key Items to Update:**

- **`clientId` & `clientSecret`**: These are pulled from environment variables. Ensure they are set in your production host.
- **`userinfo` URL**: Check the `progcode` parameter. You may need to change it from `DigiPlan` to your specific project code:
  ```typescript
  userinfo: 'https://erp.msu.ac.th/authen/api/authuser?progcode=YOUR_NEW_CODE',
  ```
- **`redirect` callback**:
  ```typescript
  async redirect({ url, baseUrl }) {
    return url.startsWith(baseUrl) ? url : `${baseUrl}/dashboard`
  }
  ```

---

## 3. Environment Variables (`.env`)

Ensure these are set in your production environment or provided to the Docker container:

| Variable              | Description                                                     |
| :-------------------- | :-------------------------------------------------------------- |
| `AUTH_CLIENT_ID`      | Your OAuth Client ID                                            |
| `AUTH_CLIENT_SECRET`  | Your OAuth Client Secret                                        |
| `NEXT_PUBLIC_API_URL` | URL of your backend (e.g., `https://domain.com/car/api`)        |
| `DATABASE_URL`        | Prisma Database connection string                               |
| `NEXTAUTH_URL`        | The full base URL of your site (e.g., `https://domain.com/car`) |
| `NEXTAUTH_SECRET`     | A random string for session encryption                          |
