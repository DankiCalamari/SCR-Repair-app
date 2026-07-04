import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCustomers } from "../../api/customers";
import { listDevices, createDevice } from "../../api/devices";
import { createRepair } from "../../api/repairs";
import type { Customer, Device } from "../../types";
import Modal from "../ui/Modal";
import { Search, Smartphone, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewRepairModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"customer" | "device" | "issue">("customer");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  // New device form
  const [deviceType, setDeviceType] = useState("Smartphone");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [imei, setImei] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [colour, setColour] = useState("");
  const [passcode, setPasscode] = useState("");
  const [accessories, setAccessories] = useState("");
  const [existingDamage, setExistingDamage] = useState("");
  const [creatingDevice, setCreatingDevice] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ["modal-customers", customerSearch],
    queryFn: () => listCustomers(0, 20, customerSearch || undefined),
    enabled: open && step === "customer",
  });

  const { data: devicesData } = useQuery({
    queryKey: ["customer-devices", selectedCustomer?.id],
    queryFn: () => listDevices(0, 50).then((d) => ({
      ...d,
      data: d.data.filter((dev: Device) => dev.customer_id === selectedCustomer?.id),
    })),
    enabled: open && step === "device" && !!selectedCustomer,
  });

  const createDeviceMutation = useMutation({
    mutationFn: (data: Parameters<typeof createDevice>[0]) => createDevice(data),
    onSuccess: (device) => {
      setSelectedDevice(device);
      setCreatingDevice(false);
      setStep("issue");
    },
  });

  const createRepairMutation = useMutation({
    mutationFn: createRepair,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setStep("customer");
    setSelectedCustomer(null);
    setSelectedDevice(null);
    setCustomerSearch("");
    setIssueDescription("");
    setCreatingDevice(false);
    setDeviceType("Smartphone");
    setBrand("");
    setModel("");
    setImei("");
    setSerialNumber("");
    setColour("");
    setPasscode("");
    setAccessories("");
    setExistingDamage("");
    onClose();
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep("device");
  };

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    setStep("issue");
  };

  const handleCreateDevice = () => {
    if (!selectedCustomer || !brand || !model) return;
    createDeviceMutation.mutate({
      customer_id: selectedCustomer.id,
      device_type: deviceType,
      brand,
      model,
      imei: imei || null,
      serial_number: serialNumber || null,
      colour: colour || null,
      passcode: passcode || null,
      accessories: accessories || null,
      existing_damage: existingDamage || null,
    });
  };

  const handleCreateRepair = () => {
    if (!selectedCustomer || !selectedDevice || !issueDescription) return;
    createRepairMutation.mutate({
      customer_id: selectedCustomer.id,
      device_id: selectedDevice.id,
      issue_description: issueDescription,
      status: "lead",
    });
  };

  const customers = customersData?.data ?? [];
  const devices = devicesData?.data ?? [];

  return (
    <Modal open={open} onClose={resetAndClose} title="New Repair" maxWidth="max-w-xl">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className={`font-medium ${step === "customer" ? "text-copper-500" : "text-warm-400"}`}>Customer</span>
        <ChevronRight className="h-3 w-3 text-warm-600" />
        <span className={`font-medium ${step === "device" ? "text-copper-500" : "text-warm-400"}`}>Device</span>
        <ChevronRight className="h-3 w-3 text-warm-600" />
        <span className={`font-medium ${step === "issue" ? "text-copper-500" : "text-warm-400"}`}>Issue</span>
      </div>

      {/* Step 1: Select Customer */}
      {step === "customer" && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full rounded-lg border border-warm-600 bg-warm-700 py-2.5 pl-10 pr-4 text-warm-50 placeholder-warm-400 focus:border-copper-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCustomer(c)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-warm-700"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-copper-500/10 text-sm font-bold text-copper-500">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-warm-50">{c.name}</p>
                  <p className="text-xs text-warm-400">{c.phone} {c.email ? `• ${c.email}` : ""}</p>
                </div>
              </button>
            ))}
            {customers.length === 0 && (
              <p className="py-8 text-center text-sm text-warm-400">
                {customerSearch ? "No customers found" : "Type to search customers"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select or Create Device */}
      {step === "device" && selectedCustomer && (
        <div>
          <p className="mb-4 text-sm text-warm-400">
            Customer: <span className="font-medium text-warm-50">{selectedCustomer.name}</span>
          </p>

          {!creatingDevice ? (
            <>
              <p className="mb-2 text-sm font-medium text-warm-300">Select a device:</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDevice(d)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-warm-700"
                  >
                    <Smartphone className="h-4 w-4 text-warm-400" />
                    <div>
                      <p className="text-sm font-medium text-warm-50">{d.brand} {d.model}</p>
                      <p className="text-xs text-warm-400">{d.device_type} {d.colour ? `• ${d.colour}` : ""}</p>
                    </div>
                  </button>
                ))}
                {devices.length === 0 && (
                  <p className="py-4 text-center text-sm text-warm-400">No devices on file for this customer</p>
                )}
              </div>
              <button
                onClick={() => setCreatingDevice(true)}
                className="mt-4 w-full rounded-lg border border-dashed border-warm-600 py-3 text-sm font-medium text-warm-400 transition hover:border-copper-500/50 hover:text-copper-500"
              >
                + Add New Device
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-warm-300">Add a new device:</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-400">Type *</label>
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
                    >
                      {["Smartphone", "Tablet", "Laptop", "Desktop PC", "Gaming Console", "Smart Watch", "Headphones/Earbuds", "Speaker", "Camera", "Drone", "Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-400">Brand *</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Apple"
                      className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-warm-400">Model *</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro"
                    className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-400">IMEI</label>
                    <input
                      type="text"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-400">Serial Number</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-400">Colour</label>
                    <input
                      type="text"
                      value={colour}
                      onChange={(e) => setColour(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-400">Passcode</label>
                    <input
                      type="text"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-warm-400">Accessories</label>
                  <input
                    type="text"
                    value={accessories}
                    onChange={(e) => setAccessories(e.target.value)}
                    placeholder="e.g. charger, case"
                    className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-warm-400">Existing Damage</label>
                  <textarea
                    value={existingDamage}
                    onChange={(e) => setExistingDamage(e.target.value)}
                    rows={2}
                    placeholder="Note any pre-existing damage..."
                    className="w-full rounded-lg border border-warm-600 bg-warm-700 px-3 py-2 text-sm text-warm-50 placeholder-warm-500 focus:border-copper-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setCreatingDevice(false)}
                  className="flex-1 rounded-lg border border-warm-600 py-2.5 text-sm font-medium text-warm-300 hover:bg-warm-700"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateDevice}
                  disabled={!brand || !model || createDeviceMutation.isPending}
                  className="flex-1 rounded-lg bg-copper-500 py-2.5 text-sm font-semibold text-warm-50 hover:bg-copper-600 disabled:opacity-50"
                >
                  {createDeviceMutation.isPending ? "Saving..." : "Save Device"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Issue Description */}
      {step === "issue" && selectedCustomer && selectedDevice && (
        <div>
          <div className="mb-4 space-y-1 text-sm text-warm-400">
            <p>Customer: <span className="font-medium text-warm-50">{selectedCustomer.name}</span></p>
            <p>Device: <span className="font-medium text-warm-50">{selectedDevice.brand} {selectedDevice.model}</span></p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-warm-300">Issue Description *</label>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue the customer is reporting..."
              className="w-full rounded-lg border border-warm-600 bg-warm-700 px-4 py-2.5 text-warm-50 placeholder-warm-400 focus:border-copper-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStep("device")}
              className="flex-1 rounded-lg border border-warm-600 py-2.5 text-sm font-medium text-warm-300 hover:bg-warm-700"
            >
              Back
            </button>
            <button
              onClick={handleCreateRepair}
              disabled={!issueDescription.trim() || createRepairMutation.isPending}
              className="flex-1 rounded-lg bg-copper-500 py-2.5 text-sm font-semibold text-warm-50 hover:bg-copper-600 disabled:opacity-50"
            >
              {createRepairMutation.isPending ? "Creating..." : "Create Repair"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

