import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { API_BASE } from "../utils/api";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Crown,
  DollarSign,
  MailPlus,
  PlusCircle,
  Receipt,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";

const defaultExpenseForm = {
  description: "",
  category: "Food",
  totalAmount: "",
  paidBy: "",
  splitUserIds: [],
  date: new Date().toISOString().split("T")[0],
};

const TripExpenseSplitter = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [myInvites, setMyInvites] = useState([]);
  const [groupInviteAcks, setGroupInviteAcks] = useState([]);
  const [invitePanelTab, setInvitePanelTab] = useState("requests");
  const [loading, setLoading] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    ...defaultExpenseForm,
    category: "",
  });
  const socketRef = useRef(null);
  const selectedGroupIdRef = useRef("");
  const canManageInvitesRef = useRef(false);
  const fetchGroupsRef = useRef(null);
  const fetchGroupExpensesRef = useRef(null);
  const fetchGroupSettlementRef = useRef(null);
  const fetchMyInvitesRef = useRef(null);
  const fetchInviteAcksRef = useRef(null);

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const selectedGroupMembers = useMemo(
    () => selectedGroup?.memberIds || [],
    [selectedGroup],
  );

  const canManageInvites = !!selectedGroup?.isOwner;

  const groupCategories = useMemo(
    () => selectedGroup?.categories || ["Food", "Travel", "Hotel", "Other"],
    [selectedGroup],
  );

  const splitPerPerson = useMemo(() => {
    const total = Number(expenseForm.totalAmount);
    const count = expenseForm.splitUserIds.length;
    if (!total || count === 0) return 0;
    return total / count;
  }, [expenseForm.totalAmount, expenseForm.splitUserIds.length]);

  const totalTripExpense = useMemo(
    () =>
      groupExpenses.reduce(
        (sum, expense) => sum + Number(expense?.totalAmount || 0),
        0,
      ),
    [groupExpenses],
  );

  const uiNeedToPay = Number(
    (settlement?.yourSummary?.youPay || [])
      .reduce((sum, item) => sum + Number(item?.amount || 0), 0)
      .toFixed(2),
  );
  const uiWillReceive = Number(
    (settlement?.yourSummary?.youReceive || [])
      .reduce((sum, item) => sum + Number(item?.amount || 0), 0)
      .toFixed(2),
  );
  const userNetBalance = Number((uiWillReceive - uiNeedToPay).toFixed(2));

  const fetchGroups = async () => {
    const res = await axios.get(`${API_BASE}/trip/groups`, { headers });
    const nextGroups = res.data?.groups || [];
    setGroups(nextGroups);
    if (!selectedGroupId && nextGroups.length) {
      setSelectedGroupId(nextGroups[0]._id);
    }
  };

  const fetchGroupExpenses = async (groupId) => {
    if (!groupId) {
      setGroupExpenses([]);
      return;
    }
    const res = await axios.get(`${API_BASE}/trip/groups/${groupId}/expenses`, {
      headers,
    });
    setGroupExpenses(res.data?.expenses || []);
  };

  const fetchGroupSettlement = async (groupId) => {
    if (!groupId) {
      setSettlement(null);
      return;
    }
    const res = await axios.get(`${API_BASE}/trip/groups/${groupId}/settlement`, {
      headers,
    });
    setSettlement(res.data?.settlement || null);
  };

  const fetchMyInvites = async () => {
    const res = await axios.get(`${API_BASE}/trip/invites/me`, { headers });
    setMyInvites(res.data?.invites || []);
  };

  const fetchInviteAcks = async (groupId) => {
    if (!groupId) {
      setGroupInviteAcks([]);
      return;
    }
    const res = await axios.get(`${API_BASE}/trip/groups/${groupId}/invites`, {
      headers,
    });
    setGroupInviteAcks(res.data?.invites || []);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchGroups(), fetchMyInvites()]);
      } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || "Failed to load trip data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const syncSelectedGroupData = async () => {
      try {
        await Promise.all([
          fetchGroupExpenses(selectedGroupId),
          fetchGroupSettlement(selectedGroupId),
        ]);
      } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || "Failed to load selected group data.");
      }
    };

    syncSelectedGroupData();
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && canManageInvites) {
      fetchInviteAcks(selectedGroupId);
      return;
    }
    setGroupInviteAcks([]);
  }, [selectedGroupId, canManageInvites]);

  useEffect(() => {
    if (!selectedGroupMembers.length) {
      setExpenseForm({ ...defaultExpenseForm, category: "" });
      return;
    }
    setExpenseForm((prev) => ({
      ...prev,
      paidBy: "",
      category: "",
      splitUserIds: selectedGroupMembers.map((member) => member._id),
    }));
  }, [selectedGroupId, selectedGroupMembers, selectedGroup]);

  const toggleSelected = (list, value) =>
    list.includes(value) ? list.filter((id) => id !== value) : [...list, value];

  const handleCreateGroup = async () => {
    if (!token) {
      alert("Please login again. Your session is missing.");
      return;
    }

    if (!groupName.trim()) {
      alert("Please enter a group name.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/trip/groups`,
        { name: groupName.trim() },
        { headers },
      );
      setGroupName("");
      await fetchGroups();
      alert("Trip group created.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!selectedGroupId) {
      alert("Please select a group first.");
      return;
    }
    if (!inviteEmail.trim()) {
      alert("Please enter user email.");
      return;
    }
    if (!canManageInvites) {
      alert("Only group creator can invite users.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/trip/groups/${selectedGroupId}/invite`,
        { email: inviteEmail.trim() },
        { headers },
      );
      alert(res.data?.message || "Invitation processed.");
      setInviteEmail("");
      await Promise.all([fetchGroups(), fetchInviteAcks(selectedGroupId)]);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to send invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!selectedGroupId) {
      alert("Please select a group first.");
      return;
    }
    if (!newCategory.trim()) {
      alert("Please enter category name.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/trip/groups/${selectedGroupId}/categories`,
        { category: newCategory.trim() },
        { headers },
      );
      setNewCategory("");
      const incomingGroup = res.data?.group;
      if (incomingGroup) {
        setGroups((prev) =>
          prev.map((group) => (group._id === incomingGroup._id ? incomingGroup : group)),
        );
      } else {
        await fetchGroups();
      }
      alert("Category added for this group.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to add category.");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (inviteId, action) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/trip/invites/${inviteId}/respond`,
        { action },
        { headers },
      );
      alert(res.data?.message || "Response updated.");
      await Promise.all([
        fetchMyInvites(),
        fetchGroups(),
        fetchGroupExpenses(selectedGroupId),
        fetchGroupSettlement(selectedGroupId),
      ]);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to respond invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSplitExpense = async () => {
    if (!selectedGroupId) {
      alert("Please select a group.");
      return;
    }
    if (!expenseForm.description.trim() || !expenseForm.totalAmount) {
      alert("Please enter description and amount.");
      return;
    }
    if (!expenseForm.category) {
      alert("Please select expense category.");
      return;
    }
    if (!expenseForm.splitUserIds.length) {
      alert("Please select at least one member to split with.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE}/trip/expenses`,
        {
          groupId: selectedGroupId,
          description: expenseForm.description.trim(),
          category: expenseForm.category,
          totalAmount: Number(expenseForm.totalAmount),
          splitUserIds: expenseForm.splitUserIds,
          date: expenseForm.date,
        },
        { headers },
      );

      await fetchGroupExpenses(selectedGroupId);
      await fetchGroupSettlement(selectedGroupId);
      setExpenseForm((prev) => ({
        ...defaultExpenseForm,
        splitUserIds: prev.splitUserIds,
        category: "",
      }));
      alert("Split expense added.");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to add split expense.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!canManageInvites) return;
    if (!window.confirm("Delete this group expense record?")) return;
    try {
      setLoading(true);
      const res = await axios.delete(`${API_BASE}/trip/expenses/${expenseId}`, {
        headers,
      });
      alert(res.data?.message || "Deleted.");
      await Promise.all([
        fetchGroupExpenses(selectedGroupId),
        fetchGroupSettlement(selectedGroupId),
      ]);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to delete expense.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
    canManageInvitesRef.current = canManageInvites;
  }, [selectedGroupId, canManageInvites]);

  useEffect(() => {
    if (!canManageInvites) {
      setInvitePanelTab("requests");
    }
  }, [canManageInvites]);

  useEffect(() => {
    fetchGroupsRef.current = fetchGroups;
    fetchGroupExpensesRef.current = fetchGroupExpenses;
    fetchGroupSettlementRef.current = fetchGroupSettlement;
    fetchMyInvitesRef.current = fetchMyInvites;
    fetchInviteAcksRef.current = fetchInviteAcks;
  });

  useEffect(() => {
    if (!token) return;

    const socketBase = API_BASE.replace(/\/api$/, "");
    const socket = io(socketBase, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const joinActiveGroup = () => {
      const activeGroupId = selectedGroupIdRef.current;
      if (activeGroupId) {
        socket.emit("trip:join-group", { groupId: activeGroupId });
      }
    };

    const refreshFromSocket = async (event) => {
      try {
        await Promise.all([
          fetchGroupsRef.current?.(),
          fetchMyInvitesRef.current?.(),
        ]);

        const activeGroupId = selectedGroupIdRef.current;
        if (!activeGroupId) return;

        if (!event?.groupId || String(event.groupId) === String(activeGroupId)) {
          await Promise.all([
            fetchGroupExpensesRef.current?.(activeGroupId),
            fetchGroupSettlementRef.current?.(activeGroupId),
          ]);

          if (canManageInvitesRef.current) {
            await fetchInviteAcksRef.current?.(activeGroupId);
          }
        }
      } catch (error) {
        console.error("Socket refresh failed:", error);
      }
    };

    socket.on("connect", joinActiveGroup);
    socket.on("trip:data-updated", refreshFromSocket);
    joinActiveGroup();

    return () => {
      socket.off("connect", joinActiveGroup);
      socket.off("trip:data-updated", refreshFromSocket);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (selectedGroupId) {
      socket.emit("trip:join-group", { groupId: selectedGroupId });
    }

    return () => {
      if (selectedGroupId) {
        socket.emit("trip:leave-group", { groupId: selectedGroupId });
      }
    };
  }, [selectedGroupId]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 md:space-y-6 md:px-5 md:py-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-sky-50 to-rose-50 p-5 shadow-[0_16px_45px_-24px_rgba(15,23,42,0.45)] md:p-7">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-28 w-28 rounded-full bg-rose-300/30 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              <span className="rounded-xl bg-sky-100 p-2 text-sky-700">
                <Users className="h-5 w-5" />
              </span>
              Trip Expense Splitter
            </h2>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Create groups, invite members, add split bills, and settle balances in real time.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:min-w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Groups</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{groups.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Trip Total</p>
              <p className="mt-1 text-xl font-bold text-sky-700">Rs. {totalTripExpense.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)]">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="rounded-lg bg-sky-100 p-1.5 text-sky-700">
              <PlusCircle className="h-4 w-4" />
            </span>
            Create Trip Group
          </h3>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name (Example: Goa Trip)"
            className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
          <p className="text-sm text-gray-500">Group creator is added automatically.</p>
          <button
            onClick={handleCreateGroup}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
          >
            Create Group
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)] xl:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="rounded-lg bg-sky-100 p-1.5 text-sky-700">
              <Users className="h-4 w-4" />
            </span>
            Select Group
          </h3>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Select a trip group</option>
            {groups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>

          {selectedGroup && (
            <div className="rounded-2xl border border-cyan-200/70 bg-cyan-50/60 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Group Members</p>
              <div className="flex flex-wrap gap-2">
                {selectedGroup.memberIds.map((member) => (
                  <span
                    key={member._id}
                    className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-xs font-medium text-cyan-700"
                  >
                    {member.name}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Creator: {selectedGroup.ownerId?.name || "Unknown"}
                {canManageInvites ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                    <Crown className="h-3 w-3" /> Admin
                  </span>
                ) : null}
              </p>
            </div>
          )}
        </section>
      </div>

      {canManageInvites && (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)]">
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-4 text-center md:px-5 md:py-5">
            <p className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
              {selectedGroup?.name || "No group selected"}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-700 md:text-sm">
              Selected Group
            </p>
          </div>

          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
              <MailPlus className="h-4 w-4" />
            </span>
            Invite user to {selectedGroup?.name || "selected group"}
          </h3>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter invite email"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={handleInviteByEmail}
              disabled={loading || !selectedGroupId}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
            >
              Send Request
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            If email is not found, acknowledgement is still stored for admin.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="rounded-lg bg-fuchsia-100 p-1.5 text-fuchsia-700">
              <MailPlus className="h-4 w-4" />
            </span>
            Group Requests Center
          </h3>

          {canManageInvites && (
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setInvitePanelTab("requests")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  invitePanelTab === "requests"
                    ? "bg-white text-fuchsia-700 shadow"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                My Group Requests ({myInvites.length})
              </button>
              <button
                onClick={() => setInvitePanelTab("admin")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  invitePanelTab === "admin"
                    ? "bg-white text-amber-700 shadow"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Admin Acknowledgements ({groupInviteAcks.length})
              </button>
            </div>
          )}
        </div>

        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          {(!canManageInvites || invitePanelTab === "requests") && (
            <>
              {!myInvites.length ? (
                <p className="text-sm text-gray-500">No pending requests for you.</p>
              ) : (
                myInvites.map((invite) => (
                  <div
                    key={invite._id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <p className="text-sm font-semibold text-gray-800">{invite.groupId?.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Invited by {invite.requestedBy?.name} ({invite.requestedBy?.email})
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleInviteResponse(invite._id, "accept")}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleInviteResponse(invite._id, "reject")}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {canManageInvites && invitePanelTab === "admin" && (
            <>
              {!selectedGroupId ? (
                <p className="text-sm text-gray-500">Select a group first.</p>
              ) : !groupInviteAcks.length ? (
                <p className="text-sm text-gray-500">No invitation records yet.</p>
              ) : (
                groupInviteAcks.map((invite) => (
                  <div
                    key={invite._id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      {invite.inviteeUserId?.name || invite.inviteeEmail}
                    </p>
                    <p className="text-xs text-gray-500">{invite.inviteeEmail}</p>
                    <p className="mt-1 text-xs">
                      Status:{" "}
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold uppercase text-gray-700">
                        {invite.status}
                      </span>
                    </p>
                    {invite.note ? (
                      <p className="mt-1 text-xs text-gray-600">{invite.note}</p>
                    ) : null}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </section>

      {selectedGroup && (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <span className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <Receipt className="h-4 w-4" />
              </span>
              Add Split Expense
            </h3>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              Per person: Rs. {splitPerPerson.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Expense description (Food, Hotel, Fuel...)"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              type="number"
              min="0"
              value={expenseForm.totalAmount}
              onChange={(e) =>
                setExpenseForm((prev) => ({ ...prev, totalAmount: e.target.value }))
              }
              placeholder="Total amount"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) =>
                setExpenseForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <select
              value={expenseForm.category}
              onChange={(e) =>
                setExpenseForm((prev) => ({ ...prev, category: e.target.value }))
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select expense category</option>
              {groupCategories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {categoryOption}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/50 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Tag className="h-4 w-4 text-indigo-600" />
                Add custom category to this group
              </p>
              <div className="flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Example: Activities, Tickets"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={loading || !selectedGroupId}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Split Between Selected Members</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selectedGroupMembers.map((member) => (
                  <label
                    key={member._id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={expenseForm.splitUserIds.includes(member._id)}
                      onChange={() =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          splitUserIds: toggleSelected(prev.splitUserIds, member._id),
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleAddSplitExpense}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
          >
            Add Split Bill
          </button>
        </section>
      )}

      {selectedGroupId && (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)]">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
              <DollarSign className="h-4 w-4" />
            </span>
            Live Settlement
          </h3>

          {!settlement ? (
            <p className="text-sm text-gray-500">Settlement not available yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-700">You Need to Pay</p>
                  <p className="mt-1 text-xl font-bold text-rose-700">Rs. {uiNeedToPay.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">You Will Receive</p>
                  <p className="mt-1 text-xl font-bold text-indigo-700">Rs. {uiWillReceive.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Net Position</p>
                  <p className="mt-1 text-xl font-bold text-sky-700">Rs. {userNetBalance.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-gray-800">
                    <ArrowUpRight className="h-4 w-4 text-rose-600" />
                    You should pay
                  </p>
                  {!settlement?.yourSummary?.youPay?.length ? (
                    <p className="text-sm text-gray-500">No pending payments from you.</p>
                  ) : (
                    <div className="space-y-2">
                      {settlement.yourSummary.youPay.map((item, idx) => (
                        <div
                          key={`${item.from}-${item.to}-${idx}`}
                          className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm"
                        >
                          <span>To {item.toUser?.name || "Unknown"}</span>
                          <span className="font-semibold text-rose-700">
                            Rs. {Number(item.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-gray-800">
                    <ArrowDownRight className="h-4 w-4 text-indigo-600" />
                    You should receive
                  </p>
                  {!settlement?.yourSummary?.youReceive?.length ? (
                    <p className="text-sm text-gray-500">No incoming payments for you.</p>
                  ) : (
                    <div className="space-y-2">
                      {settlement.yourSummary.youReceive.map((item, idx) => (
                        <div
                          key={`${item.from}-${item.to}-${idx}`}
                          className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm"
                        >
                          <span>From {item.fromUser?.name || "Unknown"}</span>
                          <span className="font-semibold text-indigo-700">
                            Rs. {Number(item.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {selectedGroupId && (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_35px_-25px_rgba(15,23,42,0.45)]">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
              <Receipt className="h-4 w-4" />
            </span>
            Group Expense History
          </h3>
          {!groupExpenses.length ? (
            <p className="text-sm text-gray-500">No trip expenses yet for this group.</p>
          ) : (
            <div>
              <div className="space-y-3">
                {groupExpenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{expense.description}</p>
                        <p className="text-xs text-gray-500">
                          Paid by {expense.paidBy?.name} on {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-base font-bold text-indigo-700">
                        Rs. {Number(expense.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      {expense.splitBetween.map((share) => (
                        <p key={share._id || share.userId?._id}>
                          {share.userId?.name}: Rs. {Number(share.amount).toFixed(2)}
                        </p>
                      ))}
                    </div>
                    {canManageInvites && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 transition hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="text-sm font-semibold text-gray-700">Total Expense (Entire Trip)</p>
                <p className="text-xl font-bold text-indigo-700">Rs. {totalTripExpense.toFixed(2)}</p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default TripExpenseSplitter;
