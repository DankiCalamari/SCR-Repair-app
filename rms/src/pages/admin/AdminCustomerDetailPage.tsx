import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomer, updateCustomer, getCustomerDevices, getCustomerRepairs } from "../../api/customers";
import { createDevice } from "../../api/devices";
import { listSmsMessages, sendSms, getSmsTemplates, sendSmsTemplate } from "../../api/sms";
import { listEmails } from "../../api/email";
import { getStatusLabel, getStatusColor, formatDate, formatDateTime, formatPhone, cn } from "../../lib/utils";
import type { CustomerWithRepairs, Device, Repair } from "../../types";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Smartphone, Wrench, Edit3, MessageSquare, Send, ChevronDown, FileText, Plus
} from "lucide-react";

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "repairs" | "devices" | "communication">("overview");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState("");
  const [newDeviceBrand, setNewDeviceBrand] = useState("");
  const [newDeviceModel, setNewDeviceModel] = useState("");
  const [newDeviceImei, setNewDeviceImei] = useState("");
  const [newDeviceSerial, setNewDeviceSerial] = useState("");
  const [newDeviceColour, setNewDeviceColour] = useState("");
  const [newDevicePasscode, setNewDevicePasscode] = useState("");
  const [newDeviceAccessories, setNewDeviceAccessories] = useState("");
  const [newDeviceDamage, setNewDeviceDamage] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [simNumber, setSimNumber] = useState<number>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: customer, isLoading, isError } = useQuery<CustomerWithRepairs>({
    queryKey: ["admin-customer", id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });

  const { data: devices } = useQuery<Device[]>({
    queryKey: ["admin-customer-devices", id],
    queryFn: () => getCustomerDevices(id!),
    enabled: !!id,
  });

  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ["admin-customer-repairs", id],
    queryFn: () => getCustomerRepairs(id!),
    enabled: !!id,
  });

  const { data: smsMessages } = useQuery({
    queryKey: ["admin-customer-sms", id],
    queryFn: () => listSmsMessages(0, 50, undefined, id),
    enabled: !!id && activeTab === "communication",
    refetchInterval: 30000,
  });

  const { data: templates } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: getSmsTemplates,
    enabled: activeTab === "communication",
  });

  const { data: emailMessages } = useQuery({
    queryKey: ["admin-customer-email", id],
    queryFn: () => listEmails(0, 50, undefined, id),
    enabled: !!id && activeTab === "communication",
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) =>
      updateCustomer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
      setEditing(false);
    },
  });

  const smsMutation = useMutation({
    mutationFn: () => sendSms({
      to_number: customer?.phone || "",
      body: smsBody,
      customer_id: id,
      sim_number: simNumber
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-sms", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      setSmsBody("");
    },
  });

  const templateSmsMutation = useMutation({
    mutationFn: (templateId: string) => sendSmsTemplate({
      template_id: templateId,
      customer_id: id,
      sim_number: simNumber
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-sms", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-communications-inbox"] });
      setSelectedTemplateId("");
    },
  });

  const addDeviceMutation = useMutation({
    mutationFn: () => createDevice({
      customer_id: id!,
      device_type: newDeviceType,
      brand: newDeviceBrand,
      model: newDeviceModel,
      imei: newDeviceImei || null,
      serial_number: newDeviceSerial || null,
      colour: newDeviceColour || null,
      passcode: newDevicePasscode || null,
      accessories: newDeviceAccessories || null,
      existing_damage: newDeviceDamage || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-devices", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
      setShowAddDevice(false);
      setNewDeviceType("");
      setNewDeviceBrand("");
      setNewDeviceModel("");
      setNewDeviceImei("");
      setNewDeviceSerial("");
      setNewDeviceColour("");
      setNewDevicePasscode("");
      setNewDeviceAccessories("");
      setNewDeviceDamage("");
    },
    onError: (error: unknown) => {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : String(error);
      alert(`Failed to add device: ${message || "Unknown error"}`);
    },
  });

  const handleStartEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditEmail(customer.email || "");
    setEditAddress(customer.address || "");
    setEditNotes(customer.notes || "");
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editName,
      phone: editPhone,
      email: editEmail || undefined,
      address: editAddress || undefined,
      notes: editNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-warm-50">{isError ? "Failed to load customer" : "Customer not found"}</h2>
          <Link to="/admin/customers" className="mt-4 inline-block text-copper-500 hover:text-copper-600">Back to Customers</Link>
        </div>
      </div>
    );
  }

  const deviceList = devices || customer.devices || [];
  const repairList = repairs || customer.repairs || [];

  const tabs = [
    { key: "overview", label: "Overview", icon: User },
    { key: "repairs", label: `Repairs (${repairList.length})`, icon: Wrench },
    { key: "devices", label: `Devices (${deviceList.length})`, icon: Smartphone },
    { key: "communication", label: "Communication", icon: MessageSquare },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-warm-400 hover:text-warm-50">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-copper-500/10 text-xl font-bold text-copper-500">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-warm-700 bg-warm-800 px-3 py-1.5 text-xl font-bold text-warm-50 focus:border-copper-500 focus:outline-none"
              />
            ) : (
              <h1 className="font-heading text-3xl font-bold text-warm-50">{customer.name}</h1>
            )}
            <p className="text-warm-400">Customer since {formatDate(customer.created_at)}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-semibold text-warm-950 hover:bg-copper-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 rounded-lg border border-warm-700 px-4 py-2 text-sm text-warm-50 hover:bg-warm-800"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 rounded-lg border border-warm-700 px-4 py-2 text-sm text-warm-50 hover:bg-warm-800"
              >
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-warm-800 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition",
              activeTab === tab.key
                ? "border-b-2 border-copper-500 text-copper-500"
                : "text-warm-400 hover:text-warm-50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-warm-800 bg-warm-900 p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-warm-400" />
                <div>
                  <p className="text-xs text-warm-400">Phone</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-warm-700 bg-warm-800 px-3 py-1.5 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-warm-50">{formatPhone(customer.phone)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-warm-400" />
                <div>
                  <p className="text-xs text-warm-400">Email</p>
                  {editing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-warm-700 bg-warm-800 px-3 py-1.5 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-warm-50">{customer.email || "—"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-warm-400" />
                <div>
                  <p className="text-xs text-warm-400">Address</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-warm-700 bg-warm-800 px-3 py-1.5 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-warm-50">{customer.address || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-warm-800 bg-warm-900 p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Notes</h3>
            {editing ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-warm-700 bg-warm-800 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                placeholder="Add notes about this customer..."
              />
            ) : (
              <p className="text-warm-300">{customer.notes || "No notes."}</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-warm-800 p-4 text-center">
                <p className="text-2xl font-bold text-copper-500">{repairList.length}</p>
                <p className="text-xs text-warm-400">Total Repairs</p>
              </div>
              <div className="rounded-lg bg-warm-800 p-4 text-center">
                <p className="text-2xl font-bold text-copper-500">{deviceList.length}</p>
                <p className="text-xs text-warm-400">Devices</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repairs Tab */}
      {activeTab === "repairs" && (
        <div className="space-y-4">
          {repairList.length === 0 ? (
            <div className="rounded-lg border border-warm-800 bg-warm-900 p-8 text-center">
              <Wrench className="mx-auto h-12 w-12 text-warm-600" />
              <h3 className="mt-4 text-lg font-semibold text-warm-50">No repairs yet</h3>
              <p className="mt-2 text-warm-400">This customer has no repair tickets.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-warm-800 bg-warm-900">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-800 text-left text-sm text-warm-400">
                    <th className="px-5 py-3 font-medium">Ticket</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Issue</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-800">
                  {repairList.map((repair) => (
                    <tr key={repair.id} className="transition hover:bg-warm-800">
                      <td className="px-5 py-4">
                        <Link to={`/admin/repairs/${repair.id}`} className="font-mono text-sm font-medium text-copper-500 hover:text-copper-600">
                          {repair.ticket_number}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", getStatusColor(repair.status))}>
                          {getStatusLabel(repair.status)}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-4 text-sm text-warm-300">{repair.issue_description}</td>
                      <td className="px-5 py-4 text-sm text-warm-400">{formatDate(repair.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-warm-50">Devices</h2>
            <button
              onClick={() => setShowAddDevice(true)}
              className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2 text-sm font-medium text-warm-950 transition-all duration-200 hover:bg-copper-600"
            >
              <Plus className="h-4 w-4" /> Add Device
            </button>
          </div>

          {showAddDevice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-lg border border-warm-700 bg-warm-900 shadow-xl">
                <div className="border-b border-warm-700 px-6 py-4">
                  <h3 className="font-heading text-lg font-semibold text-warm-50">Add New Device</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-warm-300 mb-1">Device Type *</label>
                    <select
                      value={newDeviceType}
                      onChange={(e) => setNewDeviceType(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                    >
                      <option value="">Select type</option>
                      <option value="iPhone">iPhone</option>
                      <option value="Android">Android</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Computer">Computer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-300 mb-1">Brand *</label>
                    <input
                      type="text"
                      value={newDeviceBrand}
                      onChange={(e) => setNewDeviceBrand(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      placeholder="e.g., Apple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-300 mb-1">Model *</label>
                    <input
                      type="text"
                      value={newDeviceModel}
                      onChange={(e) => setNewDeviceModel(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      placeholder="e.g., iPhone 14 Pro"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-warm-300 mb-1">IMEI</label>
                      <input
                        type="text"
                        value={newDeviceImei}
                        onChange={(e) => setNewDeviceImei(e.target.value)}
                        className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-warm-300 mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={newDeviceSerial}
                        onChange={(e) => setNewDeviceSerial(e.target.value)}
                        className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-warm-300 mb-1">Colour</label>
                      <input
                        type="text"
                        value={newDeviceColour}
                        onChange={(e) => setNewDeviceColour(e.target.value)}
                        className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-warm-300 mb-1">Passcode</label>
                      <input
                        type="text"
                        value={newDevicePasscode}
                        onChange={(e) => setNewDevicePasscode(e.target.value)}
                        className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-300 mb-1">Accessories</label>
                    <input
                      type="text"
                      value={newDeviceAccessories}
                      onChange={(e) => setNewDeviceAccessories(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      placeholder="Charger, case, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-warm-300 mb-1">Existing Damage</label>
                    <input
                      type="text"
                      value={newDeviceDamage}
                      onChange={(e) => setNewDeviceDamage(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-800 px-3 py-2 text-warm-100"
                      placeholder="Any existing damage..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-warm-700 px-6 py-4">
                  <button
                    onClick={() => setShowAddDevice(false)}
                    className="rounded-lg border border-warm-600 px-4 py-2 text-sm text-warm-300 hover:bg-warm-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addDeviceMutation.mutate()}
                    disabled={addDeviceMutation.isPending || !newDeviceType || !newDeviceBrand || !newDeviceModel}
                    className="rounded-lg bg-copper-500 px-4 py-2 text-sm font-medium text-warm-950 disabled:opacity-50"
                  >
                    {addDeviceMutation.isPending ? "Adding..." : "Add Device"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {deviceList.length === 0 && !showAddDevice ? (
            <div className="rounded-lg border border-warm-800 bg-warm-900 p-8 text-center">
              <Smartphone className="mx-auto h-12 w-12 text-warm-600" />
              <h3 className="mt-4 text-lg font-semibold text-warm-50">No devices</h3>
              <p className="mt-2 text-warm-400">No devices registered for this customer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {deviceList.map((device) => (
                <div key={device.id} className="rounded-lg border border-warm-800 bg-warm-900 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-500/10">
                      <Smartphone className="h-5 w-5 text-copper-500" />
                    </div>
                    <div>
                      <p className="font-medium text-warm-50">{device.brand} {device.model}</p>
                      <p className="text-sm text-warm-400">{device.device_type}{device.colour ? ` · ${device.colour}` : ""}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {device.imei && <div><p className="text-xs text-warm-400">IMEI</p><p className="font-mono text-xs text-warm-300">{device.imei}</p></div>}
                    {device.serial_number && <div><p className="text-xs text-warm-400">Serial</p><p className="font-mono text-xs text-warm-300">{device.serial_number}</p></div>}
                    {device.passcode && <div><p className="text-xs text-warm-400">Passcode</p><p className="font-mono text-xs text-warm-300">{device.passcode}</p></div>}
                  </div>
                  {device.accessories && <p className="mt-3 text-xs text-warm-400">Accessories: <span className="text-warm-300">{device.accessories}</span></p>}
                  {device.existing_damage && <p className="mt-1 text-xs text-warm-400">Existing damage: <span className="text-warm-300">{device.existing_damage}</span></p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Communication Tab */}
      {activeTab === "communication" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border border-warm-800 bg-warm-900 p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Send Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-warm-400">Select Template</label>
                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-warm-700 bg-warm-800 px-4 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    >
                      <option value="">Choose a template...</option>
                      {templates?.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-warm-400" />
                  </div>
                </div>
                <button
                  onClick={() => templateSmsMutation.mutate(selectedTemplateId)}
                  disabled={templateSmsMutation.isPending || !selectedTemplateId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper-500 py-2.5 font-bold text-warm-950 transition hover:bg-copper-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send Template
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-warm-800 bg-warm-900 p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-warm-50">Custom Message</h3>
              <div className="space-y-4">
                <textarea
                  placeholder="Type your message..."
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-warm-700 bg-warm-800 px-4 py-2.5 text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map(num => (
                    <button
                      key={num}
                      onClick={() => setSimNumber(num)}
                      className={cn(
                        "rounded py-1.5 text-xs font-medium border transition",
                        simNumber === num ? "border-copper-500 bg-copper-500/10 text-copper-500" : "border-warm-700 bg-warm-800 text-warm-400"
                      )}
                    >
                      SIM {num}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => smsMutation.mutate()}
                  disabled={smsMutation.isPending || !smsBody}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper-500 py-2.5 font-bold text-warm-950 transition hover:bg-copper-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send SMS
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-warm-800 bg-warm-900">
              <div className="border-b border-warm-800 px-5 py-4">
                <h3 className="font-heading text-lg font-semibold text-warm-50">SMS History</h3>
              </div>
              <div className="divide-y divide-warm-800 max-h-96 overflow-y-auto">
                {!smsMessages?.data?.length ? (
                  <div className="px-5 py-12 text-center text-warm-400">No SMS history.</div>
                ) : (
                  smsMessages.data.map((msg: any) => (
                    <div key={msg.id} className="px-5 py-4 transition hover:bg-warm-800">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          msg.direction === "outbound" ? "bg-copper-500/10 text-copper-500" : "bg-warm-500/10 text-warm-300"
                        )}>
                          {msg.direction}
                        </span>
                        <span className="text-[10px] text-warm-500 uppercase">{formatDateTime(msg.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-warm-300">{msg.body}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-medium uppercase",
                          msg.status === "delivered" ? "text-green-400" : msg.status === "failed" ? "text-red-400" : "text-yellow-400"
                        )}>
                          {msg.status}
                        </span>
                        {msg.sim_number && <span className="text-[10px] text-warm-500">• SIM {msg.sim_number}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-warm-800 bg-warm-900">
              <div className="border-b border-warm-800 px-5 py-4">
                <h3 className="font-heading text-lg font-semibold text-warm-50">Email History</h3>
              </div>
              <div className="divide-y divide-warm-800 max-h-96 overflow-y-auto">
                {!emailMessages?.data?.length ? (
                  <div className="px-5 py-12 text-center text-warm-400">No email history.</div>
                ) : (
                  emailMessages.data.map((email: any) => (
                    <div key={email.id} className="px-5 py-4 transition hover:bg-warm-800">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          email.direction === "outbound" ? "bg-copper-500/10 text-copper-500" : "bg-warm-500/10 text-warm-300"
                        )}>
                          {email.direction}
                        </span>
                        <span className="text-[10px] text-warm-500 uppercase">{formatDateTime(email.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-warm-300">{email.subject}</p>
                      <p className="mt-1 text-sm text-warm-400 truncate">{email.body}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-medium uppercase",
                          email.status === "sent" || email.status === "received" ? "text-green-400" : email.status === "failed" ? "text-red-400" : "text-yellow-400"
                        )}>
                          {email.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

