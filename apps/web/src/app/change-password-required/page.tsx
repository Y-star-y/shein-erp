import { ChangePasswordRequiredForm } from "@/components/change-password-required-form";
import { LoginPageShell } from "@/components/login-form";

export default function ChangePasswordRequiredPage() {
  return (
    <LoginPageShell>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div>
              <strong>修改密码</strong>
              <span>完成后再进入系统</span>
            </div>
          </div>
          <ChangePasswordRequiredForm />
        </div>
      </div>
    </LoginPageShell>
  );
}
