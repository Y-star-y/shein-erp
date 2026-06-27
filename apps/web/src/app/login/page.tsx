import { LoginForm, LoginPageShell } from "@/components/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <LoginPageShell>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="brand-logo">ERP</div>
            <div>
              <strong>冰域 ERP</strong>
              <span>登录以继续</span>
            </div>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </LoginPageShell>
  );
}
