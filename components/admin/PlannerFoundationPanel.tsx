"use client";

import { useEffect, useState } from "react";

import { PodRoutinePlannerPanel } from "@/components/admin/PodRoutinePlannerPanel";

const plannerMonthStorageKey = "blu-time-planner-month";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonthKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function initialPlannerMonthKey() {
  if (typeof window === "undefined") return currentMonthKey();

  const monthFromUrl = new URLSearchParams(window.location.search).get("plannerMonth");
  if (isValidMonthKey(monthFromUrl)) return monthFromUrl as string;

  const monthFromStorage = window.localStorage.getItem(plannerMonthStorageKey);
  if (isValidMonthKey(monthFromStorage)) return monthFromStorage as string;

  return currentMonthKey();
}

function persistMonthKey(monthKey: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(plannerMonthStorageKey, monthKey);

  const url = new URL(window.location.href);
  url.searchParams.set("plannerMonth", monthKey);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function PlannerFoundationPanel() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());

  useEffect(() => {
    setMonthKey(initialPlannerMonthKey());
  }, []);

  function changeMonth(nextMonthKey: string) {
    if (!isValidMonthKey(nextMonthKey)) return;
    setMonthKey(nextMonthKey);
    persistMonthKey(nextMonthKey);
  }

  return <PodRoutinePlannerPanel monthKey={monthKey} onMonthChange={changeMonth} />;
}
