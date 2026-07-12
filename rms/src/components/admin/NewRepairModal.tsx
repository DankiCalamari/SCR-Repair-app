import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCustomers } from "../../api/customers";
import { listDevices, createDevice } from "../../api/devices";
import { createRepair } from "../../api/repairs";
import { uploadPhoto } from "../../api/photos";
import type { Customer, Device, Photo } from "../../types";
import Modal from "../ui/Modal";
import { Search, Smartphone, ChevronRight, Camera, X, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewRepairModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"customer" | "device" | "issue" | "photos">("customer");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [createdRepairId, setCreatedRepairId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [intakePhotos, setIntakePhotos] = useState<File[]>([]);
  const [uploadedPhotoIds, setUploadedPhotoIds] = useState<string[]>([]);

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
    onSuccess: (repair) => {
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setCreatedRepairId(repair.id);
      setStep("photos");
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => uploadPhoto(file, {
      repairId: createdRepairId,
      category: "intake",
    }),
    onSuccess: (photo) => {
      setUploadedPhotoIds(prev => [...prev, photo.id]);
    },
  });

  const resetAndClose = () => {
    setStep("customer");
    setSelectedCustomer(null);
    setSelectedDevice(null);
    setCreatedRepairId(null);
    setCustomerSearch("");
    setIssueDescription("");
    setIntakePhotos([]);
    setUploadedPhotoIds([]);
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

  const handlePhotosComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
    queryClient.invalidateQueries({ queryKey: ["admin-repair", createdRepairId] });
    resetAndClose();
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setIntakePhotos(prev => [...prev, ...files]);
    files.forEach(file => uploadPhotoMutation.mutate(file));
  };

  const removePhoto = (index: number) => {
    setIntakePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const customers = customersData?.data ?? [];
  const devices = devicesData?.data ?? [];

  return (
    <Modal open={open} onClose={resetAndClose} title="New Repair" maxWidth="max-w-xl">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className={`font-medium ${step === "customer" ? "text-brand-500" : "text-rms-text-secondary"}`}>Customer</span>
        <ChevronRight className="h-3 w-3 text-rms-text-secondary" />
        <span className={`font-medium ${step === "device" ? "text-brand-500" : "text-rms-text-secondary"}`}>Device</span>
        <ChevronRight className="h-3 w-3 text-rms-text-secondary" />
        <span className={`font-medium ${step === "issue" ? "text-brand-500" : "text-rms-text-secondary"}`}>Issue</span>
        <ChevronRight className="h-3 w-3 text-rms-text-secondary" />
        <span className={`font-medium ${step === "photos" ? "text-brand-500" : "text-rms-text-secondary"}`}>Photos</span>
      </div>

      {/* Step 1: Select Customer */}
      {step === "customer" && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rms-text-secondary" />
            <input
              type="text"
              placeholder="Search customers by name, email, phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full rounded-lg border border-rms-border bg-rms-raised py-2.5 pl-10 pr-4 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCustomer(c)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-rms-raised"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-500">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-rms-text">{c.name}</p>
                  <p className="text-xs text-rms-text-secondary">{c.phone} {c.email ? `• ${c.email}` : ""}</p>
                </div>
              </button>
            ))}
            {customers.length === 0 && (
              <p className="py-8 text-center text-sm text-rms-text-secondary">
                {customerSearch ? "No customers found" : "Type to search customers"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select or Create Device */}
      {step === "device" && selectedCustomer && (
        <div>
          <p className="mb-4 text-sm text-rms-text-secondary">
            Customer: <span className="font-medium text-rms-text">{selectedCustomer.name}</span>
          </p>

          {!creatingDevice ? (
            <>
              <p className="mb-2 text-sm font-medium text-rms-text-secondary">Select a device:</p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDevice(d)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-rms-raised"
                  >
                    <Smartphone className="h-4 w-4 text-rms-text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-rms-text">{d.brand} {d.model}</p>
                      <p className="text-xs text-rms-text-secondary">{d.device_type} {d.colour ? `• ${d.colour}` : ""}</p>
                    </div>
                  </button>
                ))}
                {devices.length === 0 && (
                  <p className="py-4 text-center text-sm text-rms-text-secondary">No devices on file for this customer</p>
                )}
              </div>
              <button
                onClick={() => setCreatingDevice(true)}
                className="mt-4 w-full rounded-lg border border-dashed border-rms-border py-3 text-sm font-medium text-rms-text-secondary transition hover:border-brand-500/50 hover:text-brand-500"
              >
                + Add New Device
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-rms-text-secondary">Add a new device:</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Type *</label>
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                    >
                      {["Smartphone", "Tablet", "Laptop", "Desktop PC", "Gaming Console", "Smart Watch", "Headphones/Earbuds", "Speaker", "Camera", "Drone", "Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Brand *</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Apple"
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Model *</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro"
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-rms-text-secondary">IMEI</label>
                    <input
                      type="text"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Serial Number</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Colour</label>
                    <input
                      type="text"
                      value={colour}
                      onChange={(e) => setColour(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Passcode</label>
                    <input
                      type="text"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Accessories</label>
                  <input
                    type="text"
                    value={accessories}
                    onChange={(e) => setAccessories(e.target.value)}
                    placeholder="e.g. charger, case"
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-rms-text-secondary">Existing Damage</label>
                  <textarea
                    value={existingDamage}
                    onChange={(e) => setExistingDamage(e.target.value)}
                    rows={2}
                    placeholder="Note any pre-existing damage..."
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setCreatingDevice(false)}
                  className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateDevice}
                  disabled={!brand || !model || createDeviceMutation.isPending}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-rms-text hover:bg-brand-600 disabled:opacity-50"
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
          <div className="mb-4 space-y-1 text-sm text-rms-text-secondary">
            <p>Customer: <span className="font-medium text-rms-text">{selectedCustomer.name}</span></p>
            <p>Device: <span className="font-medium text-rms-text">{selectedDevice.brand} {selectedDevice.model}</span></p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rms-text-secondary">Issue Description *</label>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue the customer is reporting..."
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-4 py-2.5 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStep("device")}
              className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
            >
              Back
            </button>
            <button
              onClick={handleCreateRepair}
              disabled={!issueDescription.trim() || createRepairMutation.isPending}
              className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-rms-text hover:bg-brand-600 disabled:opacity-50"
            >
              {createRepairMutation.isPending ? "Creating..." : "Create Repair"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Intake Photos */}
      {step === "photos" && createdRepairId && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-rms-text-secondary">
            <Camera className="h-5 w-5 text-brand-500" />
            <p>Repair created! Add intake photos (optional).</p>
          </div>
          
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-rms-border py-6 text-sm font-medium text-rms-text-secondary transition hover:border-brand-500/50 hover:text-brand-500">
              <Upload className="h-5 w-5" />
              <span>Upload intake photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadPhotoMutation.isPending}
              />
            </label>
          </div>

          {intakePhotos.length > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {intakePhotos.map((photo, idx) => (
                <div key={idx} className="relative rounded-lg bg-rms-raised/50 p-2">
                  <span className="block truncate text-xs text-rms-text-secondary">{photo.name}</span>
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute right-1 top-1 rounded-full bg-rms-surface/80 p-0.5 text-rms-text-secondary hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handlePhotosComplete}
              className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-rms-text hover:bg-brand-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

