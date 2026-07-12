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
      <div className="flex min-h-screen items-center justify-center bg-rms-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rms-surface">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-rms-text">{isError ? "Failed to load customer" : "Customer not found"}</h2>
          <Link to="/admin/customers" className="mt-4 inline-block text-brand-500 hover:text-brand-600">Back to Customers</Link>
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
        <Link to="/admin/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-rms-text-secondary hover:text-rms-text">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-xl font-bold text-brand-500">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-rms-border bg-rms-raised px-3 py-1.5 text-xl font-bold text-rms-text focus:border-brand-500 focus:outline-none"
              />
            ) : (
              <h1 className="font-heading text-3xl font-bold text-rms-text">{customer.name}</h1>
            )}
            <p className="text-rms-text-secondary">Customer since {formatDate(customer.created_at)}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 rounded-lg border border-rms-border px-4 py-2 text-sm text-rms-text hover:bg-rms-raised"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 rounded-lg border border-rms-border px-4 py-2 text-sm text-rms-text hover:bg-rms-raised"
              >
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-rms-border pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition",
              activeTab === tab.key
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-rms-text-secondary hover:text-rms-text"
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
          <div className="rounded-lg border border-rms-border bg-rms-surface p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-rms-text">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-rms-text-secondary" />
                <div>
                  <p className="text-xs text-rms-text-secondary">Phone</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-1.5 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-rms-text">{formatPhone(customer.phone)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-rms-text-secondary" />
                <div>
                  <p className="text-xs text-rms-text-secondary">Email</p>
                  {editing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-1.5 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-rms-text">{customer.email || "—"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-rms-text-secondary" />
                <div>
                  <p className="text-xs text-rms-text-secondary">Address</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-1.5 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-rms-text">{customer.address || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-rms-border bg-rms-surface p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold text-rms-text">Notes</h3>
            {editing ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                placeholder="Add notes about this customer..."
              />
            ) : (
              <p className="text-rms-text-secondary">{customer.notes || "No notes."}</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-rms-raised p-4 text-center">
                <p className="text-2xl font-bold text-brand-500">{repairList.length}</p>
                <p className="text-xs text-rms-text-secondary">Total Repairs</p>
              </div>
              <div className="rounded-lg bg-rms-raised p-4 text-center">
                <p className="text-2xl font-bold text-brand-500">{deviceList.length}</p>
                <p className="text-xs text-rms-text-secondary">Devices</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repairs Tab */}
      {activeTab === "repairs" && (
        <div className="space-y-4">
          {repairList.length === 0 ? (
            <div className="rounded-lg border border-rms-border bg-rms-surface p-8 text-center">
              <Wrench className="mx-auto h-12 w-12 text-rms-text-secondary" />
              <h3 className="mt-4 text-lg font-semibold text-rms-text">No repairs yet</h3>
              <p className="mt-2 text-rms-text-secondary">This customer has no repair tickets.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-rms-border bg-rms-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-rms-border text-left text-sm text-rms-text-secondary">
                    <th className="px-5 py-3 font-medium">Ticket</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Issue</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rms-border">
                  {repairList.map((repair) => (
                    <tr key={repair.id} className="transition hover:bg-rms-raised">
                      <td className="px-5 py-4">
                        <Link to={`/admin/repairs/${repair.id}`} className="font-mono text-sm font-medium text-brand-500 hover:text-brand-600">
                          {repair.ticket_number}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", getStatusColor(repair.status))}>
                          {getStatusLabel(repair.status)}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-4 text-sm text-rms-text-secondary">{repair.issue_description}</td>
                      <td className="px-5 py-4 text-sm text-rms-text-secondary">{formatDate(repair.created_at)}</td>
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
            <h2 className="text-xl font-semibold text-rms-text">Devices</h2>
            <button
              onClick={() => setShowAddDevice(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" /> Add Device
            </button>
          </div>

          {showAddDevice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-lg border border-rms-border bg-rms-surface shadow-xl">
                <div className="border-b border-rms-border px-6 py-4">
                  <h3 className="font-heading text-lg font-semibold text-rms-text">Add New Device</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-rms-text-secondary mb-1">Device Type *</label>
                    <select
                      value={newDeviceType}
                      onChange={(e) => setNewDeviceType(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
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
                    <label className="block text-sm font-medium text-rms-text-secondary mb-1">Brand *</label>
                    <input
                      type="text"
                      value={newDeviceBrand}
                      onChange={(e) => setNewDeviceBrand(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      placeholder="e.g., Apple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-rms-text-secondary mb-1">Model *</label>
                    <input
                      type="text"
                      value={newDeviceModel}
                      onChange={(e) => setNewDeviceModel(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      placeholder="e.g., iPhone 14 Pro"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-rms-text-secondary mb-1">IMEI</label>
                      <input
                        type="text"
                        value={newDeviceImei}
                        onChange={(e) => setNewDeviceImei(e.target.value)}
                        className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rms-text-secondary mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={newDeviceSerial}
                        onChange={(e) => setNewDeviceSerial(e.target.value)}
                        className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-rms-text-secondary mb-1">Colour</label>
                      <input
                        type="text"
                        value={newDeviceColour}
                        onChange={(e) => setNewDeviceColour(e.target.value)}
                        className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rms-text-secondary mb-1">Passcode</label>
                      <input
                        type="text"
                        value={newDevicePasscode}
                        onChange={(e) => setNewDevicePasscode(e.target.value)}
                        className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-rms-text-secondary mb-1">Accessories</label>
                    <input
                      type="text"
                      value={newDeviceAccessories}
                      onChange={(e) => setNewDeviceAccessories(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      placeholder="Charger, case, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-rms-text-secondary mb-1">Existing Damage</label>
                    <input
                      type="text"
                      value={newDeviceDamage}
                      onChange={(e) => setNewDeviceDamage(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-rms-text"
                      placeholder="Any existing damage..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-rms-border px-6 py-4">
                  <button
                    onClick={() => setShowAddDevice(false)}
                    className="rounded-lg border border-rms-border px-4 py-2 text-sm text-rms-text-secondary hover:bg-rms-raised"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addDeviceMutation.mutate()}
                    disabled={addDeviceMutation.isPending || !newDeviceType || !newDeviceBrand || !newDeviceModel}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {addDeviceMutation.isPending ? "Adding..." : "Add Device"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {deviceList.length === 0 && !showAddDevice ? (
            <div className="rounded-lg border border-rms-border bg-rms-surface p-8 text-center">
              <Smartphone className="mx-auto h-12 w-12 text-rms-text-secondary" />
              <h3 className="mt-4 text-lg font-semibold text-rms-text">No devices</h3>
              <p className="mt-2 text-rms-text-secondary">No devices registered for this customer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {deviceList.map((device) => (
                <div key={device.id} className="rounded-lg border border-rms-border bg-rms-surface p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
                      <Smartphone className="h-5 w-5 text-brand-500" />
                    </div>
                    <div>
                      <p className="font-medium text-rms-text">{device.brand} {device.model}</p>
                      <p className="text-sm text-rms-text-secondary">{device.device_type}{device.colour ? ` · ${device.colour}` : ""}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {device.imei && <div><p className="text-xs text-rms-text-secondary">IMEI</p><p className="font-mono text-xs text-rms-text-secondary">{device.imei}</p></div>}
                    {device.serial_number && <div><p className="text-xs text-rms-text-secondary">Serial</p><p className="font-mono text-xs text-rms-text-secondary">{device.serial_number}</p></div>}
                    {device.passcode && <div><p className="text-xs text-rms-text-secondary">Passcode</p><p className="font-mono text-xs text-rms-text-secondary">{device.passcode}</p></div>}
                  </div>
                  {device.accessories && <p className="mt-3 text-xs text-rms-text-secondary">Accessories: <span className="text-rms-text-secondary">{device.accessories}</span></p>}
                  {device.existing_damage && <p className="mt-1 text-xs text-rms-text-secondary">Existing damage: <span className="text-rms-text-secondary">{device.existing_damage}</span></p>}
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
            <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-rms-text">Send Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-rms-text-secondary">Select Template</label>
                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-rms-border bg-rms-raised px-4 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Choose a template...</option>
                      {templates?.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-rms-text-secondary" />
                  </div>
                </div>
                <button
                  onClick={() => templateSmsMutation.mutate(selectedTemplateId)}
                  disabled={templateSmsMutation.isPending || !selectedTemplateId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send Template
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-rms-border bg-rms-surface p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-rms-text">Custom Message</h3>
              <div className="space-y-4">
                <textarea
                  placeholder="Type your message..."
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-4 py-2.5 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map(num => (
                    <button
                      key={num}
                      onClick={() => setSimNumber(num)}
                      className={cn(
                        "rounded py-1.5 text-xs font-medium border transition",
                        simNumber === num ? "border-brand-500 bg-brand-500/10 text-brand-500" : "border-rms-border bg-rms-raised text-rms-text-secondary"
                      )}
                    >
                      SIM {num}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => smsMutation.mutate()}
                  disabled={smsMutation.isPending || !smsBody}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send SMS
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-rms-border bg-rms-surface">
              <div className="border-b border-rms-border px-5 py-4">
                <h3 className="font-heading text-lg font-semibold text-rms-text">SMS History</h3>
              </div>
              <div className="divide-y divide-rms-border max-h-96 overflow-y-auto">
                {!smsMessages?.data?.length ? (
                  <div className="px-5 py-12 text-center text-rms-text-secondary">No SMS history.</div>
                ) : (
                  smsMessages.data.map((msg: any) => (
                    <div key={msg.id} className="px-5 py-4 transition hover:bg-rms-raised">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          msg.direction === "outbound" ? "bg-brand-500/10 text-brand-500" : "bg-rms-border/10 text-rms-text-secondary"
                        )}>
                          {msg.direction}
                        </span>
                        <span className="text-[10px] text-rms-text0 uppercase">{formatDateTime(msg.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-rms-text-secondary">{msg.body}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-medium uppercase",
                          msg.status === "delivered" ? "text-green-400" : msg.status === "failed" ? "text-red-400" : "text-yellow-400"
                        )}>
                          {msg.status}
                        </span>
                        {msg.sim_number && <span className="text-[10px] text-rms-text0">• SIM {msg.sim_number}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-rms-border bg-rms-surface">
              <div className="border-b border-rms-border px-5 py-4">
                <h3 className="font-heading text-lg font-semibold text-rms-text">Email History</h3>
              </div>
              <div className="divide-y divide-rms-border max-h-96 overflow-y-auto">
                {!emailMessages?.data?.length ? (
                  <div className="px-5 py-12 text-center text-rms-text-secondary">No email history.</div>
                ) : (
                  emailMessages.data.map((email: any) => (
                    <div key={email.id} className="px-5 py-4 transition hover:bg-rms-raised">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          email.direction === "outbound" ? "bg-brand-500/10 text-brand-500" : "bg-rms-border/10 text-rms-text-secondary"
                        )}>
                          {email.direction}
                        </span>
                        <span className="text-[10px] text-rms-text0 uppercase">{formatDateTime(email.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-rms-text-secondary">{email.subject}</p>
                      <p className="mt-1 text-sm text-rms-text-secondary truncate">{email.body}</p>
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

