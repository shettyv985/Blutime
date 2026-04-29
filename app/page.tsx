"use client";

import { useEffect, useState } from "react";
import { ActiveTimerCard } from "../components/ActiveTimerCard";
import { AdminPanel } from "../components/AdminPanel";
import { AuthCard } from "../components/AuthCard";
import { Header } from "../components/Header";
import { LogsTable } from "../components/LogsTable";
import { TimerForm } from "../components/TimerForm";
import { supabase } from "../lib/supabase";
import { WeeklyRoutineTracker } from "../components/WeeklyRoutineTracker";

import type {
  ActiveTimer,
  AdminLog,
  AdminUser,
  CampaignRule,
  Category,
  Client,
  Holiday,
  MemberAvailability,
  MemberClientAssignment,
  RoutineItem,
  TeamMember,
  TimeLog,
} from "../types";

const ACTIVE_TIMERS_STORAGE_KEY = "blutime-active-timers";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
    const [showRoutineBoard, setShowRoutineBoard] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [campaignRules, setCampaignRules] = useState<CampaignRule[]>([]);
  const [assignments, setAssignments] = useState<MemberClientAssignment[]>([]);
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);

  const [newClient, setNewClient] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("writer");
  const [newMemberPod, setNewMemberPod] = useState("Reshma");
  const [newMemberWeekdayCapacity, setNewMemberWeekdayCapacity] = useState(5);
  const [newMemberSaturdayCapacity, setNewMemberSaturdayCapacity] = useState(3);

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [reviewStartDate, setReviewStartDate] = useState("");
  const [reviewEndDate, setReviewEndDate] = useState("");

  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [tick, setTick] = useState(Date.now());

  const [taskText, setTaskText] = useState("");
  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState("");

  const [memberRoutineItems, setMemberRoutineItems] = useState<RoutineItem[]>([]);
  const [selectedRoutineItemId, setSelectedRoutineItemId] = useState("");
    const [selectedRoutineLocked, setSelectedRoutineLocked] = useState(false);
  

  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [leaveMemberId, setLeaveMemberId] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveCapacity, setLeaveCapacity] = useState(0);
  const [leaveReason, setLeaveReason] = useState("");
  const [rebalanceFromDate, setRebalanceFromDate] = useState("2026-05-01");
  const [newCampaignClientName, setNewCampaignClientName] = useState("");
  const [newCampaignType, setNewCampaignType] =
    useState<CampaignRule["campaign_type"]>("performance");
  const [newCampaignPod, setNewCampaignPod] = useState("Reshma");
  const [newCampaignAccountManager, setNewCampaignAccountManager] = useState("");
  const [newCampaignStaticCount, setNewCampaignStaticCount] = useState(0);
  const [newCampaignVideoCount, setNewCampaignVideoCount] = useState(0);
  const [newCampaignCanvaCount, setNewCampaignCanvaCount] = useState(0);
  const [newCampaignAiVideoCount, setNewCampaignAiVideoCount] = useState(0);
  const [newCampaignShootVideoCount, setNewCampaignShootVideoCount] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [newAssignmentClientName, setNewAssignmentClientName] = useState("");
  const [newAssignmentMemberId, setNewAssignmentMemberId] = useState("");


  const canStart = Boolean(taskText.trim() && clientId && category);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

      useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);



  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    loadCurrentMember();
    checkAdmin();
    loadRoutineBoardData();

    supabase
      .from("clients")
      .select("id,name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setClients(data ?? []));

    supabase
      .from("categories")
      .select("id,name")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));

    loadLogs();
  }, [user]);


      useEffect(() => {
    if (!currentMember) {
      setMemberRoutineItems([]);
      setSelectedRoutineItemId("");
      setSelectedRoutineLocked(false);
      return;
    }

    loadMemberRoutineItems(currentMember);
  }, [currentMember]);



  useEffect(() => {
    if (!user?.email) return;
    const restoredTimers = loadSavedTimers(user.email);
    setTimers(restoredTimers);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    saveTimers(user.email, timers);
  }, [timers, user?.email]);

    useEffect(() => {
    setMounted(true);
  }, []);


  async function loadCurrentMember() {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .ilike("email", user.email)
      .eq("is_active", true)
      .maybeSingle();

    setCurrentMember(data ?? null);
  }

  async function checkAdmin() {
    const { data } = await supabase
      .from("admin_users")
      .select("id,email")
      .ilike("email", user.email)
      .maybeSingle();

    const admin = Boolean(data);
    setIsAdmin(admin);

    if (admin) {
      loadAdminData();
    }
  }

  async function loadLogs() {
    const { data } = await supabase
      .from("time_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    setLogs(data ?? []);
  }

  async function loadAdminData() {
    const [
      { data: logsData },
      { data: adminsData },
      { data: membersData },
      { data: rulesData },
      { data: assignmentsData },
      { data: routineData },
      { data: holidaysData },
      { data: availabilityData },
    ] = await Promise.all([
      supabase.from("time_logs").select("*").order("started_at", { ascending: false }),
      supabase.from("admin_users").select("id,email").order("email"),
      supabase
        .from("team_members")
        .select("*")
        .eq("is_active", true)
        .order("pod")
        .order("role")
        .order("name"),
      supabase
        .from("campaign_rules")
        .select("*")
        .eq("is_active", true)
        .order("pod")
        .order("client_name"),
      supabase
        .from("member_client_assignments")
        .select("*")
        .eq("is_active", true)
        .order("member_name"),
      supabase.from("routine_items").select("*").order("work_date").order("person_name"),
      supabase.from("holidays").select("*").order("holiday_date"),
      supabase.from("member_availability").select("*").order("unavailable_date"),
    ]);

    setAdminLogs(logsData ?? []);
    setAdmins(adminsData ?? []);
    setMembers(membersData ?? []);
    setCampaignRules(rulesData ?? []);
    setAssignments(assignmentsData ?? []);
    setRoutineItems(routineData ?? []);
    setHolidays(holidaysData ?? []);
    setAvailability(availabilityData ?? []);
  }
    async function updateMemberRole(member: TeamMember, role: TeamMember["role"]) {
    const { error } = await supabase.from("team_members").update({ role }).eq("id", member.id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadAdminData();
  }

  async function updateMemberPod(member: TeamMember, pod: string) {
    const { error } = await supabase.from("team_members").update({ pod }).eq("id", member.id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadAdminData();
  }

  async function updateMemberWeekdayCapacity(member: TeamMember, value: number) {
    const { error } = await supabase
      .from("team_members")
      .update({ weekday_capacity: value })
      .eq("id", member.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }
  async function addAssignment() {
    if (!newAssignmentClientName || !newAssignmentMemberId) return;

    const member = members.find((item) => item.id === newAssignmentMemberId);
    if (!member) return;

    const alreadyExists = assignments.some(
      (item) =>
        item.client_name === newAssignmentClientName &&
        item.team_member_id === member.id &&
        item.is_active
    );

    if (alreadyExists) {
      alert("This assignment already exists.");
      return;
    }

    const { error } = await supabase.from("member_client_assignments").insert({
      team_member_id: member.id,
      member_name: member.name,
      role: member.role,
      client_name: newAssignmentClientName,
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewAssignmentClientName("");
    setNewAssignmentMemberId("");
    await loadAdminData();
  }

  async function deactivateAssignment(assignment: MemberClientAssignment) {
    const { error } = await supabase
      .from("member_client_assignments")
      .update({ is_active: false })
      .eq("id", assignment.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function updateMemberSaturdayCapacity(member: TeamMember, value: number) {
    const { error } = await supabase
      .from("team_members")
      .update({ saturday_capacity: value })
      .eq("id", member.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function addCampaignRule() {
    if (!newCampaignClientName.trim()) return;

    const totalVideo = newCampaignAiVideoCount + newCampaignShootVideoCount;

    const { error } = await supabase.from("campaign_rules").insert({
      pod: newCampaignPod,
      account_manager: newCampaignAccountManager.trim(),
      client_name: newCampaignClientName.trim(),
      campaign_type: newCampaignType,
      static_count: newCampaignStaticCount,
      video_count: totalVideo,
      canva_count: newCampaignCanvaCount,
      ai_video_count: newCampaignAiVideoCount,
      shoot_video_count: newCampaignShootVideoCount,
      extra_if_target_not_met: false,
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewCampaignClientName("");
    setNewCampaignType("performance");
    setNewCampaignPod("Reshma");
    setNewCampaignAccountManager("");
    setNewCampaignStaticCount(0);
    setNewCampaignVideoCount(0);
    setNewCampaignCanvaCount(0);
    setNewCampaignAiVideoCount(0);
    setNewCampaignShootVideoCount(0);

    await loadAdminData();
  }

  async function updateCampaignRule(rule: CampaignRule, patch: Partial<CampaignRule>) {
    const nextAi = patch.ai_video_count ?? rule.ai_video_count ?? 0;
    const nextShoot = patch.shoot_video_count ?? rule.shoot_video_count ?? 0;

    const payload: Partial<CampaignRule> = {
      ...patch,
      video_count: nextAi + nextShoot,
    };

    const { error } = await supabase.from("campaign_rules").update(payload).eq("id", rule.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function deactivateCampaignRule(rule: CampaignRule) {
    const { error } = await supabase
      .from("campaign_rules")
      .update({ is_active: false })
      .eq("id", rule.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }


  function getMay2026WorkDays() {
    const days: string[] = [];

    for (let day = 1; day <= 31; day++) {
      const date = new Date(2026, 4, day);
      const weekDay = date.getDay();
      const isSunday = weekDay === 0;
      const isSaturday = weekDay === 6;

      if (isSunday) continue;

      if (isSaturday) {
        const saturdayNumber = Math.ceil(day / 7);
        if (saturdayNumber !== 1 && saturdayNumber !== 3) continue;
      }

      const dateKey = `2026-05-${String(day).padStart(2, "0")}`;

      if (holidays.some((holiday) => holiday.holiday_date === dateKey)) {
        continue;
      }

      days.push(dateKey);
    }

    return days;
  }

  function getDayNumber(dateKey: string) {
    return Number(dateKey.slice(-2));
  }

  function getWeekNumber(dateKey: string) {
    return Math.ceil(getDayNumber(dateKey) / 7);
  }

  function isSaturday(dateKey: string) {
    const day = getDayNumber(dateKey);
    return new Date(2026, 4, day).getDay() === 6;
  }

  function getCapacity(member: TeamMember, dateKey: string) {
    const availabilityEntry = availability.find(
      (item) => item.team_member_id === member.id && item.unavailable_date === dateKey
    );

    if (availabilityEntry) {
      return availabilityEntry.capacity_override ?? 0;
    }

    return isSaturday(dateKey) ? member.saturday_capacity : member.weekday_capacity;
  }

  function loadSavedTimers(userEmail: string) {
    try {
      const raw = localStorage.getItem(ACTIVE_TIMERS_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as Record<string, ActiveTimer[]>;
      return parsed[userEmail] ?? [];
    } catch {
      return [];
    }
  }

  function saveTimers(userEmail: string, timersToSave: ActiveTimer[]) {
    try {
      const raw = localStorage.getItem(ACTIVE_TIMERS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, ActiveTimer[]>) : {};
      parsed[userEmail] = timersToSave;
      localStorage.setItem(ACTIVE_TIMERS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore local storage errors
    }
  }

  function getTodayDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
  }
  const sharedRoutineRoles: TeamMember["role"][] = ["writer", "designer", "editor"];

  function isSharedRoutineItem(item: RoutineItem) {
    return currentMember ? item.team_member_id !== currentMember.id : false;
  }
    function buildReassignmentNote(originalItem: RoutineItem) {
    return `Reassigned from ${originalItem.person_name} (orig:${originalItem.id})`;
  }

  function extractOriginalRoutineItemId(note?: string | null) {
    if (!note) return null;

    const match = note.match(/\(orig:([^)]+)\)/);
    return match?.[1] ?? null;
  }


    async function loadMemberRoutineItems(member: TeamMember) {
    const eligibleForSharedQueue = sharedRoutineRoles.includes(member.role);

    if (!eligibleForSharedQueue) {
      const { data } = await supabase
        .from("routine_items")
        .select("*")
        .eq("team_member_id", member.id)
        .order("work_date")
        .order("client_name");

      setMemberRoutineItems(data ?? []);
      return;
    }

    const { data: sameRoleMembers, error: membersError } = await supabase
      .from("team_members")
      .select("id,name,role,pod,weekday_capacity,saturday_capacity,is_active,email")
      .eq("role", member.role)
      .eq("is_active", true);

    if (membersError || !sameRoleMembers) {
      setMemberRoutineItems([]);
      return;
    }

    const sameRoleMemberIds = sameRoleMembers.map((item) => item.id);

    const { data: routineData, error: routineError } = await supabase
      .from("routine_items")
      .select("*")
      .in("team_member_id", sameRoleMemberIds)
      .order("work_date")
      .order("client_name");

    if (routineError || !routineData) {
      setMemberRoutineItems([]);
      return;
    }

    const otherMemberIds = sameRoleMemberIds.filter((id) => id !== member.id);

    let absentEntries: Pick<MemberAvailability, "team_member_id" | "unavailable_date" | "capacity_override">[] =
      [];

    if (otherMemberIds.length > 0) {
      const { data: availabilityData } = await supabase
        .from("member_availability")
        .select("team_member_id,unavailable_date,capacity_override")
        .in("team_member_id", otherMemberIds);

      absentEntries = availabilityData ?? [];
    }

    const fullyAbsentKeys = new Set(
      absentEntries
        .filter((item) => (item.capacity_override ?? 0) === 0)
        .map((item) => `${item.team_member_id}-${item.unavailable_date}`)
    );

    const visibleItems = routineData.filter((item) => {
      const isOwnItem = item.team_member_id === member.id;

      if (isOwnItem) {
        return true;
      }

      const isAbsentSharedItem = fullyAbsentKeys.has(`${item.team_member_id}-${item.work_date}`);
      return isAbsentSharedItem;
    });

    visibleItems.sort((a, b) => {
      if (a.work_date !== b.work_date) return a.work_date.localeCompare(b.work_date);
      if (a.team_member_id === member.id && b.team_member_id !== member.id) return -1;
      if (a.team_member_id !== member.id && b.team_member_id === member.id) return 1;
      if (a.person_name !== b.person_name) return a.person_name.localeCompare(b.person_name);
      return a.client_name.localeCompare(b.client_name);
    });

    setMemberRoutineItems(visibleItems);
  }


   function getCategoryCampaignFamily(categoryName: string) {
    const value = categoryName.toLowerCase();

    if (value.includes("video") && value.includes("social media")) {
      return "social_media";
    }

    if (value.includes("video") && value.includes("ads")) {
      return "performance";
    }

    if (value.includes("social media")) return "social_media";
    if (value.includes("ads")) return "performance";
    if (value.includes("video")) return "video";

    return "other";
  }


  function categoryMatchesRoutine(categoryName: string, item: RoutineItem) {
    if (!categoryName) return true;

    if (item.campaign_type === "carry_forward") {
      return true;
    }

    const family = getCategoryCampaignFamily(categoryName);

    if (item.campaign_type === "performance") {
      return family === "performance";
    }

    if (item.campaign_type === "social_media") {
      return family === "social_media";
    }

    return true;
  }

     function handleRoutineItemChange(value: string) {
    setSelectedRoutineItemId(value);
    setSelectedRoutineLocked(Boolean(value));

    const selectedItem = memberRoutineItems.find((item) => item.id === value);
    if (!selectedItem) return;

    const matchedClient = clients.find((item) => item.name === selectedItem.client_name);
    if (matchedClient) {
      setClientId(matchedClient.id);
    }

    if (!taskText.trim()) {
      const ownerSuffix =
        currentMember && selectedItem.team_member_id !== currentMember.id
          ? ` (${selectedItem.person_name})`
          : "";

      setTaskText(`${selectedItem.client_name} - ${selectedItem.output_type}${ownerSuffix}`);
    }
  }



    function handleClientIdChange(value: string) {
    setClientId(value);

    if (selectedRoutineLocked) {
      return;
    }

    const selectedClient = clients.find((item) => item.id === value);
    if (!selectedClient) {
      setSelectedRoutineItemId("");
      return;
    }

    const matchingRoutine = todayRoutineItems.find(
      (item) =>
        item.client_name === selectedClient.name &&
        categoryMatchesRoutine(category, item)
    );

    setSelectedRoutineItemId(matchingRoutine?.id ?? "");
  }


    function handleCategoryChange(value: string) {
    setCategory(value);

    if (selectedRoutineLocked) {
      return;
    }

    const selectedClient = clients.find((item) => item.id === clientId);
    if (!selectedClient) return;

    const matchingRoutine = todayRoutineItems.find(
      (item) =>
        item.client_name === selectedClient.name &&
        categoryMatchesRoutine(value, item)
    );

    setSelectedRoutineItemId(matchingRoutine?.id ?? "");
  }


  async function generateMay2026RoutinePlan() {
    const confirmed = confirm(
      "Generate May 2026 routine plan? This will replace existing May 2026 routine items."
    );
    if (!confirmed) return;

    const { data: plan, error: planError } = await supabase
      .from("routine_plans")
      .upsert({ month_start: "2026-05-01", status: "active" }, { onConflict: "month_start" })
      .select()
      .single();

    if (planError || !plan) {
      alert(planError?.message ?? "Could not create plan");
      return;
    }

    await supabase.from("routine_items").delete().eq("plan_id", plan.id);

    const workDays = getMay2026WorkDays();
    const usage = new Map<string, number>();
    const generated: Omit<RoutineItem, "id">[] = [];
    const activeMembers = members.filter((member) => member.is_active);

    function used(memberId: string, dateKey: string) {
      return usage.get(`${memberId}-${dateKey}`) ?? 0;
    }

    function addUsage(memberId: string, dateKey: string, count: number) {
      usage.set(`${memberId}-${dateKey}`, used(memberId, dateKey) + count);
    }

        function addRoutine(
      member: TeamMember,
      dateKey: string,
      clientName: string,
      campaignType: string,
      outputType: string,
      count: number,
      notes?: string,
      podOverride?: string
    ) {
      generated.push({
        plan_id: plan.id,
        work_date: dateKey,
        team_member_id: member.id,
        person_name: member.name,
        role: member.role,
        pod: podOverride ?? member.pod,
        client_name: clientName,
        campaign_type: campaignType,
        output_type: outputType,
        planned_count: count,
        completed_count: 0,
        carried_from: null,
        is_unplanned: false,
        notes: notes ?? null,
      });

      addUsage(member.id, dateKey, count);
    }

         function allocateOneOnDates(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      candidateDates: string[],
      notes?: string,
      podOverride?: string
    ) {
      for (const dateKey of candidateDates) {
        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        addRoutine(
          member,
          dateKey,
          clientName,
          campaignType,
          outputType,
          1,
          notes,
          podOverride
        );
        return true;
      }

      return false;
    }


        function distributeBalancedAcrossMembers(
      memberList: TeamMember[],
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      candidateDates: string[],
      notes?: string,
      podOverride?: string
    ) {
      if (memberList.length === 0 || total <= 0) return 0;

      let remaining = total;
      let cursor = 0;
      let stalledRounds = 0;

      while (remaining > 0 && stalledRounds < memberList.length) {
        const member = memberList[cursor % memberList.length];
        const allocated = allocateOneOnDates(
          member,
          clientName,
          campaignType,
          outputType,
          candidateDates,
          notes,
          podOverride
        );

        if (allocated) {
          remaining -= 1;
          stalledRounds = 0;
        } else {
          stalledRounds += 1;
        }

        cursor += 1;
      }

      return total - remaining;
    }


        function distributeBalanced(
      memberList: TeamMember[],
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      weekOneOnly = false,
      notes?: string,
      podOverride?: string
    ) {
      const candidateDates = weekOneOnly
        ? workDays.filter((dateKey) => getWeekNumber(dateKey) === 1)
        : workDays;

      return distributeBalancedAcrossMembers(
        memberList,
        clientName,
        campaignType,
        outputType,
        total,
        candidateDates,
        notes,
        podOverride
      );
    }


        function distributeBalancedWeeklyMinimum(
      memberList: TeamMember[],
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      weeklyMinimum: number,
      notes?: string,
      podOverride?: string
    ) {
      if (memberList.length === 0 || total <= 0) return;

      let remaining = total;

      for (let week = 1; week <= 5; week++) {
        if (remaining <= 0) break;

        const weekDates = getWeekDates(week);
        if (weekDates.length === 0) continue;

        const weekTarget = Math.min(weeklyMinimum, remaining);
        const allocated = distributeBalancedAcrossMembers(
          memberList,
          clientName,
          campaignType,
          outputType,
          weekTarget,
          weekDates,
          notes,
          podOverride
        );

        remaining -= allocated;
      }

      if (remaining > 0) {
        distributeBalancedAcrossMembers(
          memberList,
          clientName,
          campaignType,
          outputType,
          remaining,
          workDays,
          notes,
          podOverride
        );
      }
    }


        function distributeShootVideoBalancedWeeklyMinimum(
      productionMember: TeamMember,
      editorList: TeamMember[],
      clientName: string,
      campaignType: string,
      total: number,
      weeklyMinimum: number,
      podOverride?: string
    ) {
      if (editorList.length === 0 || total <= 0) return;

      let remaining = total;

      for (let week = 1; week <= 5; week++) {
        if (remaining <= 0) break;

        const weekDates = getWeekDates(week);
        if (weekDates.length === 0) continue;

        const weekTarget = Math.min(weeklyMinimum, remaining);

        const shootAllocations = allocateAndCaptureOnDates(
          productionMember,
          clientName,
          campaignType,
          "shoot",
          weekTarget,
          weekDates
        );

        const allocatedShootCount = shootAllocations.reduce(
          (sum, allocation) => sum + allocation.count,
          0
        );

        if (allocatedShootCount > 0) {
          const allowedEditorDates = weekDates.filter((dateKey) =>
            shootAllocations.some((allocation) => allocation.dateKey <= dateKey)
          );

          distributeBalancedAcrossMembers(
            editorList,
            clientName,
            campaignType,
            "video",
            allocatedShootCount,
            allowedEditorDates,
            "Requires production first",
            podOverride
          );

          remaining -= allocatedShootCount;
        }
      }

      if (remaining > 0) {
        const shootAllocations = allocateAndCaptureOnDates(
          productionMember,
          clientName,
          campaignType,
          "shoot",
          remaining,
          workDays
        );

        const allocatedShootCount = shootAllocations.reduce(
          (sum, allocation) => sum + allocation.count,
          0
        );

        if (allocatedShootCount > 0) {
          const allowedEditorDates = workDays.filter((dateKey) =>
            shootAllocations.some((allocation) => allocation.dateKey <= dateKey)
          );

          distributeBalancedAcrossMembers(
            editorList,
            clientName,
            campaignType,
            "video",
            allocatedShootCount,
            allowedEditorDates,
            "Requires production first",
            podOverride
          );
        }
      }
    }



        function distribute(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      weekOneOnly = false,
      notes?: string
    ) {
      let remaining = total;

      for (const dateKey of workDays) {
        if (remaining <= 0) break;
        if (weekOneOnly && getWeekNumber(dateKey) !== 1) continue;

        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        const count = Math.min(capacityLeft, remaining);
        addRoutine(member, dateKey, clientName, campaignType, outputType, count, notes);
        remaining -= count;
      }
    }
        function getCreativeTestingOutputType(role: TeamMember["role"]) {
      if (role === "writer") return "creative testing copy";
      if (role === "designer") return "creative testing creative";
      if (role === "editor") return "creative testing video";
      return "creative testing";
    }

    function addCreativeTestingFillers() {
      for (const member of activeMembers) {
        if (!["writer", "designer", "editor"].includes(member.role)) continue;

        for (const dateKey of workDays) {
          const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
          if (capacityLeft <= 0) continue;

          addRoutine(
            member,
            dateKey,
            "Creative Testing",
            "creative_testing",
            getCreativeTestingOutputType(member.role),
            capacityLeft,
            "Capacity filler"
          );
        }
      }
    }


    function allocateOnDates(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      candidateDates: string[],
      notes?: string
    ) {
      let remaining = total;

      for (const dateKey of candidateDates) {
        if (remaining <= 0) break;

        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        const count = Math.min(capacityLeft, remaining);
        addRoutine(member, dateKey, clientName, campaignType, outputType, count, notes);
        remaining -= count;
      }

      return total - remaining;
    }

    function allocateAndCaptureOnDates(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      candidateDates: string[],
      notes?: string
    ) {
      let remaining = total;
      const allocations: { dateKey: string; count: number }[] = [];

      for (const dateKey of candidateDates) {
        if (remaining <= 0) break;

        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        const count = Math.min(capacityLeft, remaining);
        addRoutine(member, dateKey, clientName, campaignType, outputType, count, notes);
        allocations.push({ dateKey, count });
        remaining -= count;
      }

      return allocations;
    }

    function getSocialWeeklyMinimum(clientName: string) {
      const value = clientName.trim().toLowerCase();

      if (
        value === "dormakaba global".toLowerCase() ||
        value === "dormakaba healthcare".toLowerCase()
      ) {
        return 3;
      }

      return 2;
    }

    function getWeekDates(weekNumber: number) {
      return workDays.filter((dateKey) => getWeekNumber(dateKey) === weekNumber);
    }

    function distributeWeeklyMinimum(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      weeklyMinimum: number,
      notes?: string
    ) {
      let remaining = total;

      for (let week = 1; week <= 5; week++) {
        if (remaining <= 0) break;

        const weekDates = getWeekDates(week);
        if (weekDates.length === 0) continue;

        const weekTarget = Math.min(weeklyMinimum, remaining);
        const allocated = allocateOnDates(
          member,
          clientName,
          campaignType,
          outputType,
          weekTarget,
          weekDates,
          notes
        );

        remaining -= allocated;
      }

      if (remaining > 0) {
        allocateOnDates(
          member,
          clientName,
          campaignType,
          outputType,
          remaining,
          workDays,
          notes
        );
      }
    }

    function distributeShootVideoWeeklyMinimum(
      productionMember: TeamMember,
      editorMember: TeamMember,
      clientName: string,
      campaignType: string,
      total: number,
      weeklyMinimum: number
    ) {
      let remaining = total;

      for (let week = 1; week <= 5; week++) {
        if (remaining <= 0) break;

        const weekDates = getWeekDates(week);
        if (weekDates.length === 0) continue;

        const weekTarget = Math.min(weeklyMinimum, remaining);

        const shootAllocations = allocateAndCaptureOnDates(
          productionMember,
          clientName,
          campaignType,
          "shoot",
          weekTarget,
          weekDates
        );

        const allocatedShootCount = shootAllocations.reduce(
          (sum, allocation) => sum + allocation.count,
          0
        );

        if (allocatedShootCount > 0) {
          const allowedEditorDates = weekDates.filter((dateKey) =>
            shootAllocations.some((allocation) => allocation.dateKey <= dateKey)
          );

          allocateOnDates(
            editorMember,
            clientName,
            campaignType,
            "video",
            allocatedShootCount,
            allowedEditorDates,
            "Requires production first"
          );

          remaining -= allocatedShootCount;
        }
      }

      if (remaining > 0) {
        const shootAllocations = allocateAndCaptureOnDates(
          productionMember,
          clientName,
          campaignType,
          "shoot",
          remaining,
          workDays
        );

        const allocatedShootCount = shootAllocations.reduce(
          (sum, allocation) => sum + allocation.count,
          0
        );

        if (allocatedShootCount > 0) {
          const allowedEditorDates = workDays.filter((dateKey) =>
            shootAllocations.some((allocation) => allocation.dateKey <= dateKey)
          );

          allocateOnDates(
            editorMember,
            clientName,
            campaignType,
            "video",
            allocatedShootCount,
            allowedEditorDates,
            "Requires production first"
          );
        }
      }
    }

        function distributeAndCaptureDates(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      weekOneOnly = false,
      notes?: string
    ) {
      let remaining = total;
      const allocations: { dateKey: string; count: number }[] = [];

      for (const dateKey of workDays) {
        if (remaining <= 0) break;
        if (weekOneOnly && getWeekNumber(dateKey) !== 1) continue;
        if (campaignType === "social_media" && getWeekNumber(dateKey) === 1) continue;

        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        const count = Math.min(capacityLeft, remaining);
        addRoutine(member, dateKey, clientName, campaignType, outputType, count, notes);
        allocations.push({ dateKey, count });
        remaining -= count;
      }

      return allocations;
    }

    function distributeFromAllowedDates(
      member: TeamMember,
      clientName: string,
      campaignType: string,
      outputType: string,
      total: number,
      allowedDates: string[],
      notes?: string
    ) {
      let remaining = total;

      for (const dateKey of allowedDates) {
        if (remaining <= 0) break;

        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        const count = Math.min(capacityLeft, remaining);
        addRoutine(member, dateKey, clientName, campaignType, outputType, count, notes);
        remaining -= count;
      }
    }


    for (const member of activeMembers) {
      if (member.role === "designer") {
        distribute(
          member,
          "Carry-forward",
          "carry_forward",
          "creative",
          6,
          true,
          "Previous month pending workload"
        );
      }

      if (member.role === "editor") {
        distribute(
          member,
          "Carry-forward",
          "carry_forward",
          "video",
          6,
          true,
          "Previous month pending workload"
        );
      }

      if (member.role === "production") {
        distribute(
          member,
          "Carry-forward",
          "carry_forward",
          "shoot",
          6,
          true,
          "Previous month pending workload"
        );
      }
    }

         for (const rule of campaignRules) {
      const designers = activeMembers.filter(
        (member) =>
          member.role === "designer" &&
          assignments.some(
            (assignment) =>
              assignment.team_member_id === member.id &&
              assignment.client_name === rule.client_name
          )
      );

      const writers = activeMembers.filter(
        (member) =>
          member.role === "writer" &&
          assignments.some(
            (assignment) =>
              assignment.team_member_id === member.id &&
              assignment.client_name === rule.client_name
          )
      );

      const editors = activeMembers.filter(
        (member) =>
          member.role === "editor" &&
          assignments.some(
            (assignment) =>
              assignment.team_member_id === member.id &&
              assignment.client_name === rule.client_name
          )
      );

      const production = activeMembers.find((member) => member.role === "production");

      const designTotal = rule.static_count + rule.canva_count;
      const aiVideoCount = rule.ai_video_count ?? 0;
      const shootVideoCount =
        rule.shoot_video_count ?? Math.max(0, rule.video_count - aiVideoCount);
      const totalVideoCount = aiVideoCount + shootVideoCount;
      const writerTotal = rule.static_count + totalVideoCount;

      if (rule.campaign_type === "social_media") {
        const weeklyMinimum = getSocialWeeklyMinimum(rule.client_name);

        if (designers.length > 0 && designTotal > 0) {
          distributeBalancedWeeklyMinimum(
            designers,
            rule.client_name,
            rule.campaign_type,
            rule.canva_count > 0 ? "canva" : "creative",
            designTotal,
            weeklyMinimum,
            undefined,
            rule.pod
          );
        }

        if (writers.length > 0 && writerTotal > 0) {
          distributeBalancedWeeklyMinimum(
            writers,
            rule.client_name,
            rule.campaign_type,
            "copy/script",
            writerTotal,
            weeklyMinimum,
            undefined,
            rule.pod
          );
        }

        if (editors.length > 0 && aiVideoCount > 0) {
          distributeBalancedWeeklyMinimum(
            editors,
            rule.client_name,
            rule.campaign_type,
            "video",
            aiVideoCount,
            weeklyMinimum,
            undefined,
            rule.pod
          );
        }

        if (production && editors.length > 0 && shootVideoCount > 0) {
          distributeShootVideoBalancedWeeklyMinimum(
            production,
            editors,
            rule.client_name,
            rule.campaign_type,
            shootVideoCount,
            weeklyMinimum,
            rule.pod
          );
        }

        continue;
      }

      if (designers.length > 0 && designTotal > 0) {
        distributeBalanced(
          designers,
          rule.client_name,
          rule.campaign_type,
          rule.canva_count > 0 ? "canva" : "creative",
          designTotal,
          false,
          undefined,
          rule.pod
        );
      }

      if (writers.length > 0 && writerTotal > 0) {
        distributeBalanced(
          writers,
          rule.client_name,
          rule.campaign_type,
          "copy/script",
          writerTotal,
          false,
          undefined,
          rule.pod
        );
      }

      if (editors.length > 0 && aiVideoCount > 0) {
        distributeBalanced(
          editors,
          rule.client_name,
          rule.campaign_type,
          "video",
          aiVideoCount,
          false,
          undefined,
          rule.pod
        );
      }

      if (production && editors.length > 0 && shootVideoCount > 0) {
        distributeShootVideoBalancedWeeklyMinimum(
          production,
          editors,
          rule.client_name,
          rule.campaign_type,
          shootVideoCount,
          shootVideoCount,
          rule.pod
        );
      }
    }





    addCreativeTestingFillers();

    if (generated.length === 0) {
      alert("No routine items generated. Check members, campaign rules, and assignments.");
      return;
    }

    const { error } = await supabase.from("routine_items").insert(generated);

    if (error) {
      alert(error.message);
      return;
    }

    alert(`Generated ${generated.length} routine items for May 2026.`);
    await loadRoutineBoardData();
    await loadAdminData();

  }

  async function addClient() {
    if (!newClient.trim()) return;

    const { error } = await supabase.from("clients").insert({
      name: newClient.trim(),
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewClient("");
    reloadLists();
  }

  async function deactivateClient(client: Client) {
    const { error } = await supabase
      .from("clients")
      .update({ is_active: false })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    reloadLists();
  }

  async function addMember() {
    if (!newMemberName.trim()) return;

    const { error } = await supabase.from("team_members").insert({
      name: newMemberName.trim(),
      email: newMemberEmail.trim() || null,
      role: newMemberRole,
      pod: newMemberPod,
      weekday_capacity: newMemberWeekdayCapacity,
      saturday_capacity: newMemberSaturdayCapacity,
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewMemberName("");
    setNewMemberEmail("");
    await loadRoutineBoardData();
    await loadAdminData();

  }

  async function deactivateMember(member: TeamMember) {
    const { error } = await supabase
      .from("team_members")
      .update({ is_active: false })
      .eq("id", member.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function updateMemberEmail(member: TeamMember, nextEmail: string) {
    const cleanEmail = nextEmail.trim().toLowerCase();

    const { error } = await supabase
      .from("team_members")
      .update({ email: cleanEmail || null })
      .eq("id", member.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function addCategory() {
    if (!newCategory.trim()) return;

    const { error } = await supabase.from("categories").insert({
      name: newCategory.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewCategory("");
    reloadLists();
  }

  async function deleteCategory(categoryItem: Category) {
    const { error } = await supabase.from("categories").delete().eq("id", categoryItem.id);

    if (error) {
      alert(error.message);
      return;
    }

    reloadLists();
  }

  async function addAdmin() {
    if (!newAdminEmail.trim()) return;

    const { error } = await supabase.from("admin_users").insert({
      email: newAdminEmail.trim().toLowerCase(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewAdminEmail("");
    await loadAdminData();
  }

  async function removeAdmin(admin: AdminUser) {
    const { error } = await supabase.from("admin_users").delete().eq("id", admin.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  function reloadLists() {
    supabase
      .from("clients")
      .select("id,name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setClients(data ?? []));

    supabase
      .from("categories")
      .select("id,name")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));

    if (isAdmin) {
      loadAdminData();
    }
  }

  async function updateRating(
    logId: string,
    rating: "Excellent" | "Good" | "Acceptable" | "Bad" | ""
  ) {
    const { error } = await supabase
      .from("time_logs")
      .update({ quality_rating: rating || null })
      .eq("id", logId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function updateLog(
    logId: string,
    patch: {
      started_at: string;
      ended_at: string;
      task_text: string;
      client_id: string;
      category: string;
      output_text: string;
    }
  ) {
    const startedAt = new Date(patch.started_at);
    const endedAt = new Date(patch.ended_at);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      alert("Please enter valid start and end date/time values.");
      return;
    }

    if (endedAt <= startedAt) {
      alert("End time must be later than start time.");
      return;
    }

    const matchedClient = clients.find((client) => client.id === patch.client_id);
    if (!matchedClient) {
      alert("Please select a client.");
      return;
    }

    if (!patch.category) {
      alert("Please select a category.");
      return;
    }

    const totalSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    const { data: updatedLog, error } = await supabase
      .from("time_logs")
      .update({
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        total_seconds: totalSeconds,
        task_text: patch.task_text.trim(),
        client_id: matchedClient.id,
        client_name: matchedClient.name,
        category: patch.category,
        output_text: patch.output_text.trim(),
      })
      .eq("id", logId)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setLogs((current) =>
      current.map((log) => (log.id === logId ? ((updatedLog as TimeLog) ?? log) : log))
    );

    if (isAdmin) {
      setAdminLogs((current) =>
        current.map((log) => (log.id === logId ? ((updatedLog as AdminLog) ?? log) : log))
      );
      await loadAdminData();
    }
  }

  async function deleteOwnLog(logId: string) {
    const confirmed = confirm("Delete this log permanently?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("time_logs")
      .delete()
      .eq("id", logId)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setLogs((current) => current.filter((log) => log.id !== logId));

    if (isAdmin) {
      setAdminLogs((current) => current.filter((log) => log.id !== logId));
      await loadAdminData();
    }

    if (currentMember) {
      await loadMemberRoutineItems(currentMember);
    }

    await loadRoutineBoardData();
  }

      async function deleteLog(logId: string) {
    const confirmed = confirm("Delete this log permanently?");
    if (!confirmed) return;

    const { data: logToDelete, error: fetchError } = await supabase
      .from("time_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (fetchError) {
      alert(fetchError.message);
      return;
    }

    let linkedRoutineItem: RoutineItem | null = null;
    let originalRoutineItem: RoutineItem | null = null;

    if (logToDelete?.routine_item_id) {
      const { data, error: routineFetchError } = await supabase
        .from("routine_items")
        .select("*")
        .eq("id", logToDelete.routine_item_id)
        .single();

      if (routineFetchError) {
        alert(routineFetchError.message);
        return;
      }

      linkedRoutineItem = data;

      const originalRoutineItemId = extractOriginalRoutineItemId(linkedRoutineItem?.notes);

      if (originalRoutineItemId) {
        const { data: originalData, error: originalFetchError } = await supabase
          .from("routine_items")
          .select("*")
          .eq("id", originalRoutineItemId)
          .single();

        if (originalFetchError) {
          alert(originalFetchError.message);
          return;
        }

        originalRoutineItem = originalData;
      }
    }

    const { error: deleteLogError } = await supabase.from("time_logs").delete().eq("id", logId);

    if (deleteLogError) {
      alert(deleteLogError.message);
      return;
    }

    if (linkedRoutineItem) {
      if (originalRoutineItem) {
        const nextCompletedCount = Math.max(0, (linkedRoutineItem.completed_count ?? 0) - 1);
        const nextPlannedCount = Math.max(0, (linkedRoutineItem.planned_count ?? 0) - 1);

        if (nextPlannedCount === 0 && nextCompletedCount === 0) {
          const { error: reassignedDeleteError } = await supabase
            .from("routine_items")
            .delete()
            .eq("id", linkedRoutineItem.id);

          if (reassignedDeleteError) {
            alert(reassignedDeleteError.message);
            return;
          }
        } else {
          const { error: reassignedUpdateError } = await supabase
            .from("routine_items")
            .update({
              planned_count: nextPlannedCount,
              completed_count: nextCompletedCount,
            })
            .eq("id", linkedRoutineItem.id);

          if (reassignedUpdateError) {
            alert(reassignedUpdateError.message);
            return;
          }
        }

        const { error: originalUpdateError } = await supabase
          .from("routine_items")
          .update({
            planned_count: (originalRoutineItem.planned_count ?? 0) + 1,
          })
          .eq("id", originalRoutineItem.id);

        if (originalUpdateError) {
          alert(originalUpdateError.message);
          return;
        }
      } else {
        const nextCompletedCount = Math.max(0, (linkedRoutineItem.completed_count ?? 0) - 1);

        const { error: routineUpdateError } = await supabase
          .from("routine_items")
          .update({ completed_count: nextCompletedCount })
          .eq("id", linkedRoutineItem.id);

        if (routineUpdateError) {
          alert(routineUpdateError.message);
          return;
        }
      }
    }

         if (currentMember) {
      await loadMemberRoutineItems(currentMember);
    }

    await loadLogs();
    await loadRoutineBoardData();

    if (isAdmin) {
      await loadAdminData();
    }


  }



  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function signOut() {
    if (user?.email) {
      saveTimers(user.email, []);
    }
    await supabase.auth.signOut();
    setTimers([]);
    setLogs([]);
    setCurrentMember(null);
  }

  async function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) return;

    const { error } = await supabase.from("holidays").insert({
      holiday_date: newHolidayDate,
      name: newHolidayName.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewHolidayDate("");
    setNewHolidayName("");
    await loadAdminData();
  }

  async function removeHoliday(id: string) {
    const { error } = await supabase.from("holidays").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }

  async function addAvailability() {
    if (!leaveMemberId || !leaveDate) return;

    const member = members.find((item) => item.id === leaveMemberId);
    if (!member) return;

    const { error } = await supabase.from("member_availability").upsert(
      {
        team_member_id: member.id,
        member_name: member.name,
        unavailable_date: leaveDate,
        capacity_override: leaveCapacity,
        reason: leaveReason.trim() || null,
      },
      { onConflict: "team_member_id,unavailable_date" }
    );

    if (error) {
      alert(error.message);
      return;
    }

    setLeaveMemberId("");
    setLeaveDate("");
    setLeaveCapacity(0);
    setLeaveReason("");
    await loadAdminData();
  }

  async function removeAvailability(id: string) {
    const { error } = await supabase.from("member_availability").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAdminData();
  }
  async function loadRoutineBoardData() {
    const [{ data: routineData }, { data: rulesData }] = await Promise.all([
      supabase.from("routine_items").select("*").order("work_date").order("person_name"),
      supabase
        .from("campaign_rules")
        .select("*")
        .eq("is_active", true)
        .order("pod")
        .order("client_name"),
    ]);

    setRoutineItems(routineData ?? []);
    setCampaignRules(rulesData ?? []);
  }

  async function rebalanceRoutinePlan() {
    if (!rebalanceFromDate) return;

    const confirmed = confirm(
      `Rebalance pending future work from ${rebalanceFromDate}? Completed work will be kept.`
    );
    if (!confirmed) return;

    const { data: plan } = await supabase
      .from("routine_plans")
      .select("*")
      .eq("month_start", "2026-05-01")
      .maybeSingle();

    if (!plan) {
      alert("No active May 2026 plan found.");
      return;
    }

    const futureItems = routineItems.filter((item) => item.work_date >= rebalanceFromDate);
    const preservedItems = futureItems.filter((item) => item.completed_count > 0);
    const itemsToRebuild = futureItems.filter((item) => item.completed_count === 0);

    const remainingWork = itemsToRebuild
      .map((item) => ({
        member: members.find((member) => member.id === item.team_member_id),
        client_name: item.client_name,
        campaign_type: item.campaign_type,
        output_type: item.output_type,
        planned_count: item.planned_count,
        notes: item.notes ?? undefined,
      }))
      .filter((item) => item.member);

    const idsToDelete = itemsToRebuild.map((item) => item.id);

    if (idsToDelete.length > 0) {
      await supabase.from("routine_items").delete().in("id", idsToDelete);
    }

    const workDays = getMay2026WorkDays().filter((dateKey) => dateKey >= rebalanceFromDate);
    const usage = new Map<string, number>();

    for (const item of preservedItems) {
      usage.set(`${item.team_member_id}-${item.work_date}`, item.planned_count);
    }

    const rebuilt: Omit<RoutineItem, "id">[] = [];

    function used(memberId: string, dateKey: string) {
      return usage.get(`${memberId}-${dateKey}`) ?? 0;
    }

    function addUsage(memberId: string, dateKey: string, count: number) {
      usage.set(`${memberId}-${dateKey}`, used(memberId, dateKey) + count);
    }

         function addRoutine(
      member: TeamMember,
      dateKey: string,
      clientName: string,
      campaignType: string,
      outputType: string,
      count: number,
      notes?: string,
      podOverride?: string
    ) {
      rebuilt.push({
        plan_id: plan.id,
        work_date: dateKey,
        team_member_id: member.id,
        person_name: member.name,
        role: member.role,
        pod: podOverride ?? member.pod,
        client_name: clientName,
        campaign_type: campaignType,
        output_type: outputType,
        planned_count: count,
        completed_count: 0,
        carried_from: rebalanceFromDate,
        is_unplanned: false,
        notes: notes ?? null,
      });

      addUsage(member.id, dateKey, count);
    }




    for (const workItem of remainingWork) {
      let remaining = workItem.planned_count;
      const member = workItem.member as TeamMember;

      for (const dateKey of workDays) {
        if (remaining <= 0) break;

        const capacityLeft = getCapacity(member, dateKey) - used(member.id, dateKey);
        if (capacityLeft <= 0) continue;

        const count = Math.min(capacityLeft, remaining);
        addRoutine(
          member,
          dateKey,
          workItem.client_name,
          workItem.campaign_type,
          workItem.output_type,
          count,
          workItem.notes
        );
        remaining -= count;
      }
    }

    if (rebuilt.length > 0) {
      const { error } = await supabase.from("routine_items").insert(rebuilt);
      if (error) {
        alert(error.message);
        return;
      }
    }

    await loadAdminData();
  }

  const pendingRoutineItems = memberRoutineItems
    .filter((item) => item.completed_count < item.planned_count)
    .sort((a, b) => a.work_date.localeCompare(b.work_date));

  const todayDateKey = getTodayDateKey();

  const exactTodayRoutineItems = pendingRoutineItems.filter(
    (item) => item.work_date === todayDateKey
  );

  const nextRoutineDate =
    exactTodayRoutineItems[0]?.work_date ??
    pendingRoutineItems.find((item) => item.work_date >= todayDateKey)?.work_date ??
    pendingRoutineItems[0]?.work_date ??
    "";

    const todayRoutineItems = pendingRoutineItems.filter(
    (item) => item.work_date === nextRoutineDate
  );

  const ownTodayRoutineItems = todayRoutineItems.filter(
    (item) => item.team_member_id === currentMember?.id
  );

  const sharedTodayRoutineItems = todayRoutineItems.filter(
    (item) => item.team_member_id !== currentMember?.id
  );

  const selectedRoutineItem =
    todayRoutineItems.find((item) => item.id === selectedRoutineItemId) ?? null;

  const routineDateLabel = nextRoutineDate
    ? new Date(`${nextRoutineDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const sharedRoutineNotice =
    sharedTodayRoutineItems.length > 0
      ? `${sharedTodayRoutineItems.length} absent-team task${sharedTodayRoutineItems.length > 1 ? "s are" : " is"} available for pickup.`
      : "";


  const selectedClientName = clients.find((item) => item.id === clientId)?.name ?? "";

    const routineWarning =
    currentMember &&
    clientId &&
    todayRoutineItems.length > 0 &&
    selectedClientName &&
    !todayRoutineItems.some(
      (item) =>
        item.client_name === selectedClientName &&
        categoryMatchesRoutine(category, item)
    )
      ? `${selectedClientName} is not part of the routine currently being shown for this category. You can still continue as unplanned work.`
      : sharedRoutineNotice;


    function startTimer() {
    const client = clients.find((item) => item.id === clientId);
    if (!client || !canStart) return;

    const autoMatchedRoutine =
      selectedRoutineItem ??
      todayRoutineItems.find(
        (item) =>
          item.client_name === client.name &&
          categoryMatchesRoutine(category, item) &&
          item.completed_count < item.planned_count
      ) ??
      null;

    const sharedOwnerLabel =
      currentMember && autoMatchedRoutine && autoMatchedRoutine.team_member_id !== currentMember.id
        ? `Assigned to ${autoMatchedRoutine.person_name}`
        : null;

    setTimers((current) => [
      {
        id: crypto.randomUUID(),
        taskText: taskText.trim(),
        clientId,
        clientName: client.name,
        category,
        routineItemId: autoMatchedRoutine?.id ?? null,
        routineLabel: autoMatchedRoutine
          ? `${autoMatchedRoutine.client_name} · ${autoMatchedRoutine.campaign_type} · ${autoMatchedRoutine.output_type}${sharedOwnerLabel ? ` · ${sharedOwnerLabel}` : ""}`
          : null,
        startedAt: new Date().toISOString(),
        elapsedBeforePause: 0,
        runningSince: Date.now(),
        outputText: "",
        persisted: true,
      },
      ...current,
    ]);

    setTaskText("");
    setClientId("");
    setCategory("");
    setSelectedRoutineItemId("");
        setSelectedRoutineLocked(false);

  }


  function getElapsed(timer: ActiveTimer) {
    if (!timer.runningSince) return timer.elapsedBeforePause;
    return timer.elapsedBeforePause + Math.floor((tick - timer.runningSince) / 1000);
  }

  function pauseTimer(id: string) {
    setTimers((current) =>
      current.map((timer) =>
        timer.id === id && timer.runningSince
          ? {
              ...timer,
              elapsedBeforePause: getElapsed(timer),
              runningSince: null,
            }
          : timer
      )
    );
  }

  function resumeTimer(id: string) {
    setTimers((current) =>
      current.map((timer) =>
        timer.id === id && !timer.runningSince
          ? { ...timer, runningSince: Date.now() }
          : timer
      )
    );
  }

  function updateOutput(id: string, outputText: string) {
    setTimers((current) =>
      current.map((timer) => (timer.id === id ? { ...timer, outputText } : timer))
    );
  }

  function cancelTimer(id: string) {
    setTimers((current) => current.filter((timer) => timer.id !== id));
  }

      async function stopTimer(timer: ActiveTimer) {
    if (!timer.outputText.trim()) {
      alert("Please paste or type the output before stopping.");
      return;
    }

    if (!currentMember) {
      alert("Your login is not mapped to a team member.");
      return;
    }

    const totalSeconds = getElapsed(timer);
    const endedAt = new Date().toISOString();

    if (timer.routineItemId) {
      const { error } = await supabase.rpc("complete_shared_routine_task", {
        p_routine_item_id: timer.routineItemId,
        p_user_id: user.id,
        p_user_email: user.email,
        p_team_member_id: currentMember.id,
        p_team_member_name: currentMember.name,
        p_team_member_role: currentMember.role,
        p_team_member_pod: currentMember.pod,
        p_task_text: timer.taskText,
        p_output_text: timer.outputText.trim(),
        p_client_id: timer.clientId,
        p_client_name: timer.clientName,
        p_category: timer.category,
        p_started_at: timer.startedAt,
        p_ended_at: endedAt,
        p_total_seconds: totalSeconds,
      });

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("time_logs").insert({
        user_id: user.id,
        user_email: user.email,
        routine_item_id: null,
        task_text: timer.taskText,
        output_text: timer.outputText.trim(),
        client_id: timer.clientId,
        client_name: timer.clientName,
        category: timer.category,
        started_at: timer.startedAt,
        ended_at: endedAt,
        total_seconds: totalSeconds,
      });

      if (error) {
        alert(error.message);
        return;
      }
    }

    setTimers((current) => current.filter((item) => item.id !== timer.id));
    if (currentMember) {
      await loadMemberRoutineItems(currentMember);
    }

    await loadLogs();
    await loadRoutineBoardData();

    if (isAdmin) {
      await loadAdminData();
    }

  }



      if (!mounted || authLoading) {
    return null;
  }

  if (!user) {
    return (
      <AuthCard
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    );
  }




  return (
    <main className="min-h-screen">
      <Header
        email={user.email}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onSignOut={signOut}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {!currentMember ? (
          <div className="card mb-4 rounded-2xl p-4">
            <h3 className="font-semibold">Profile mapping missing</h3>
            <p className="mt-1 text-sm text-muted">
              This login is not mapped to a team member profile yet. Routine suggestions will stay hidden until admin links your email in team members.
            </p>
          </div>
        ) : null}

                <TimerForm
          taskText={taskText}
          clientId={clientId}
          category={category}
          clients={clients}
          categories={categories}
          routineItems={todayRoutineItems}
          routineDateLabel={routineDateLabel}
          selectedRoutineItemId={selectedRoutineItemId}
          routineWarning={routineWarning}
          canStart={canStart}
          currentMemberId={currentMember?.id ?? ""}
          onTaskTextChange={setTaskText}
          onClientIdChange={handleClientIdChange}
          onCategoryChange={handleCategoryChange}
          onRoutineItemChange={handleRoutineItemChange}
          onStart={startTimer}
        />
        <section className="mt-4">
          <div className="card rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Routine board</h3>
                <p className="mt-1 text-sm text-muted">
                  View the weekly routine grouped pod-wise across the team.
                </p>
              </div>

              <button
                onClick={() => setShowRoutineBoard((current) => !current)}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  border: "1px solid var(--border)",
                  background: showRoutineBoard ? "var(--primary)" : "var(--surface-soft)",
                  color: showRoutineBoard ? "white" : "var(--foreground)",
                }}
              >
                {showRoutineBoard ? "Hide routine" : "Routine"}
              </button>
            </div>
          </div>
        </section>
        {showRoutineBoard && (
  <section className="mt-4">
    <WeeklyRoutineTracker
      items={routineItems}
      campaignRules={campaignRules}
      highlightedPersonName={currentMember?.name}
    />
  </section>
)}



        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Running timers</h2>
            <p className="text-sm text-muted">Pause, resume, or stop active work.</p>
          </div>

          <div className="grid gap-4">
            {timers.length === 0 && (
              <div className="card rounded-2xl p-5 text-muted">No active timers.</div>
            )}

            {timers.map((timer) => (
              <ActiveTimerCard
                key={timer.id}
                timer={timer}
                elapsed={getElapsed(timer)}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onOutputChange={updateOutput}
                onStop={stopTimer}
                onCancel={cancelTimer}
              />
            ))}
          </div>
        </section>

        <LogsTable
          logs={logs}
          clients={clients}
          categories={categories}
          onSaveLog={updateLog}
          onDeleteLog={deleteOwnLog}
        />

        {isAdmin && (
          <AdminPanel
            clients={clients}
            categories={categories}
            admins={admins}
            logs={adminLogs}
            newClient={newClient}
            newCategory={newCategory}
            newAdminEmail={newAdminEmail}
            selectedEmployee={selectedEmployee}
            reviewStartDate={reviewStartDate}
            reviewEndDate={reviewEndDate}
            onNewClientChange={setNewClient}
            onNewCategoryChange={setNewCategory}
            onNewAdminEmailChange={setNewAdminEmail}
            onAddClient={addClient}
            onDeactivateClient={deactivateClient}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            onAddAdmin={addAdmin}
            onRemoveAdmin={removeAdmin}
            onSelectedEmployeeChange={setSelectedEmployee}
            onReviewStartDateChange={setReviewStartDate}
            onReviewEndDateChange={setReviewEndDate}
            onRatingChange={updateRating}
            onDeleteLog={deleteLog}
            members={members}
            newMemberName={newMemberName}
            newMemberEmail={newMemberEmail}
            newMemberRole={newMemberRole}
            newMemberPod={newMemberPod}
            newMemberWeekdayCapacity={newMemberWeekdayCapacity}
            newMemberSaturdayCapacity={newMemberSaturdayCapacity}
            onNewMemberNameChange={setNewMemberName}
            onNewMemberEmailChange={setNewMemberEmail}
            onNewMemberRoleChange={setNewMemberRole}
            onNewMemberPodChange={setNewMemberPod}
            onNewMemberWeekdayCapacityChange={setNewMemberWeekdayCapacity}
            onNewMemberSaturdayCapacityChange={setNewMemberSaturdayCapacity}
            onAddMember={addMember}
            onDeactivateMember={deactivateMember}
            onUpdateMemberEmail={updateMemberEmail}
            routineItems={routineItems}
            onGenerateRoutinePlan={generateMay2026RoutinePlan}
            holidays={holidays}
            availability={availability}
            newHolidayDate={newHolidayDate}
            newHolidayName={newHolidayName}
            leaveMemberId={leaveMemberId}
            leaveDate={leaveDate}
            leaveCapacity={leaveCapacity}
            leaveReason={leaveReason}
            rebalanceFromDate={rebalanceFromDate}
            onHolidayDateChange={setNewHolidayDate}
            onHolidayNameChange={setNewHolidayName}
            onLeaveMemberChange={setLeaveMemberId}
            onLeaveDateChange={setLeaveDate}
            onLeaveCapacityChange={setLeaveCapacity}
            onLeaveReasonChange={setLeaveReason}
            onRebalanceFromDateChange={setRebalanceFromDate}
            onAddHoliday={addHoliday}
            onRemoveHoliday={removeHoliday}
            onAddAvailability={addAvailability}
            onRemoveAvailability={removeAvailability}
            onRebalanceRoutinePlan={rebalanceRoutinePlan}
            campaignRules={campaignRules}
                        newCampaignClientName={newCampaignClientName}
            newCampaignType={newCampaignType}
            newCampaignPod={newCampaignPod}
            newCampaignAccountManager={newCampaignAccountManager}
            newCampaignStaticCount={newCampaignStaticCount}
            newCampaignVideoCount={newCampaignVideoCount}
            newCampaignCanvaCount={newCampaignCanvaCount}
            newCampaignAiVideoCount={newCampaignAiVideoCount}
            newCampaignShootVideoCount={newCampaignShootVideoCount}
            onNewCampaignClientNameChange={setNewCampaignClientName}
            onNewCampaignTypeChange={setNewCampaignType}
            onNewCampaignPodChange={setNewCampaignPod}
            onNewCampaignAccountManagerChange={setNewCampaignAccountManager}
            onNewCampaignStaticCountChange={setNewCampaignStaticCount}
            onNewCampaignVideoCountChange={setNewCampaignVideoCount}
            onNewCampaignCanvaCountChange={setNewCampaignCanvaCount}
            onNewCampaignAiVideoCountChange={setNewCampaignAiVideoCount}
            onNewCampaignShootVideoCountChange={setNewCampaignShootVideoCount}
            onAddCampaignRule={addCampaignRule}
            onUpdateCampaignRule={updateCampaignRule}
            onDeactivateCampaignRule={deactivateCampaignRule}
            onUpdateMemberRole={updateMemberRole}
            onUpdateMemberPod={updateMemberPod}
            onUpdateMemberWeekdayCapacity={updateMemberWeekdayCapacity}
            onUpdateMemberSaturdayCapacity={updateMemberSaturdayCapacity}
            assignments={assignments}
            newAssignmentClientName={newAssignmentClientName}
            newAssignmentMemberId={newAssignmentMemberId}
            onNewAssignmentClientNameChange={setNewAssignmentClientName}
            onNewAssignmentMemberIdChange={setNewAssignmentMemberId}
            onAddAssignment={addAssignment}
            onDeactivateAssignment={deactivateAssignment}

          />
        )}
      </div>
    </main>
  );
}
