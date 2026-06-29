"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReadOnlyValueField, TextField } from "./ui";

function shouldLookupEmployeeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  return /^1\d{10}$/.test(trimmed.replace(/\s/g, ""));
}

async function lookupEmployee(query: string) {
  const response = await fetch(`/api/users/lookup?q=${encodeURIComponent(query.trim())}`);
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    user?: { email: string; name: string };
  };

  if (!response.ok) {
    return { error: body.error || "员工账号不存在或已停用" };
  }

  return { user: body.user! };
}

export function AdminEmployeeAccountFields({
  accountError,
  employeeAccount,
  employeeName,
  onChange,
}: {
  accountError?: string;
  employeeAccount: string;
  employeeName: string;
  onChange: (patch: { employeeAccount: string; employeeName: string }) => void;
}) {
  const [lookupError, setLookupError] = useState<string>();
  const [lookingUp, setLookingUp] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);
  const accountRef = useRef(employeeAccount);
  accountRef.current = employeeAccount;

  const runLookup = useCallback(
    async (account: string) => {
      const trimmed = account.trim();
      if (!trimmed) {
        setLookupError(undefined);
        onChange({ employeeAccount: account, employeeName: "" });
        return;
      }

      if (!shouldLookupEmployeeInput(trimmed)) {
        setLookupError(undefined);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLookingUp(true);
      setLookupError(undefined);

      try {
        const result = await lookupEmployee(trimmed);
        if (requestId !== requestIdRef.current) return;

        if ("error" in result && result.error) {
          onChange({ employeeAccount: trimmed, employeeName: "" });
          setLookupError(result.error);
          return;
        }

        onChange({
          employeeAccount: result.user!.email,
          employeeName: result.user!.name,
        });
      } finally {
        if (requestId === requestIdRef.current) {
          setLookingUp(false);
        }
      }
    },
    [onChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function scheduleLookup(account: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runLookup(account);
    }, 400);
  }

  function handleAccountChange(fieldValue: string) {
    onChange({ employeeAccount: fieldValue, employeeName });
    scheduleLookup(fieldValue);
  }

  return (
    <>
      <TextField
        error={accountError || lookupError}
        label="员工账号"
        onBlur={() => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = undefined;
          }
          void runLookup(accountRef.current);
        }}
        onChange={handleAccountChange}
        placeholder="邮箱或手机号"
        required
        value={employeeAccount}
      />
      <ReadOnlyValueField
        emptyText={lookingUp ? "检索中…" : "—"}
        label="员工姓名"
        value={employeeName}
      />
    </>
  );
}
