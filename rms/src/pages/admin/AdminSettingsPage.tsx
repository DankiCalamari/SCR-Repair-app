import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save, Building2, Mail, Smartphone, Shield, Bell, Palette, Image,
  CheckCircle, Copy, Check
} from "lucide-react";
import { getSettings, updateSetting, uploadLogo, uploadAdminLogo, uploadFavicon, uploadEmailSignature } from "../../api/system-settings";
import { getSmsSettings, updateSmsSettings } from "../../api/sms";

interface SettingSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: SettingSection[] = [
  { id: "business", label: "Business Info", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "email", label: "Email (SMTP)", icon: Mail },
  { id: "email-incoming", label: "Email (IMAP)", icon: Mail },
  { id: "sms", label: "SMS Gateway", icon: Smartphone },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("business");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Business
  const [businessName, setBusinessName] = useState("Sunset Country Repairs");
  const [businessEmail, setBusinessEmail] = useState("info@sunsetcountryrepairs.com.au");
  const [businessPhone, setBusinessPhone] = useState("03 5023 0000");
  const [abn, setAbn] = useState("");

  // Branding
  const [primaryColor, setPrimaryColor] = useState("#f59e0b");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [logoUrl, setLogoUrl] = useState("");
  const [adminLogoUrl, setAdminLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [adminLogoPreview, setAdminLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [adminLogoUploading, setAdminLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [emailSigPreview, setEmailSigPreview] = useState<string | null>(null);
  const [emailSigUploading, setEmailSigUploading] = useState(false);
  const [emailSignature, setEmailSignature] = useState("");

  // SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Sunset Country Repairs");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpUseTls, setSmtpUseTls] = useState(true);

  // IMAP
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  // SMS Gateway (Dedicated)
  const [smsUsername, setSmsUsername] = useState("");
  const [smsWebhookSecret, setSmsWebhookSecret] = useState("");
  const [smsIsActive, setSmsIsActive] = useState(true);

  // Security
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [requireEmailVerify, setRequireEmailVerify] = useState(true);

  // Notifications
  const [notifyNewLead, setNotifyNewLead] = useState(true);
  const [notifyQuoteApproved, setNotifyQuoteApproved] = useState(true);
  const [notifyRepairComplete, setNotifyRepairComplete] = useState(true);
  const [notifyWarrantyClaim, setNotifyWarrantyClaim] = useState(true);

  const { data: serverSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getSettings,
  });

  const { data: smsSettings, isLoading: isLoadingSms } = useQuery({
    queryKey: ["sms-settings"],
    queryFn: getSmsSettings,
  });

  useEffect(() => {
    if (serverSettings) {
      const s = serverSettings;
      if (s.business_name) setBusinessName(s.business_name);
      if (s.business_email) setBusinessEmail(s.business_email);
      if (s.business_phone) setBusinessPhone(s.business_phone);
      if (s.abn) setAbn(s.abn);
      if (s.primary_color) setPrimaryColor(s.primary_color);
      if (s.accent_color) setAccentColor(s.accent_color);
      if (s.logo_url) { setLogoUrl(s.logo_url); setLogoPreview(s.logo_url); }
      if (s.admin_logo_url) { setAdminLogoUrl(s.admin_logo_url); setAdminLogoPreview(s.admin_logo_url); }
      if (s.favicon_url) { setFaviconUrl(s.favicon_url); setFaviconPreview(s.favicon_url); }
      if (s.email_signature) { setEmailSignature(s.email_signature); setEmailSigPreview(s.email_signature); }
      if (s.smtp_host) setSmtpHost(s.smtp_host);
      if (s.smtp_port) setSmtpPort(s.smtp_port);
      if (s.smtp_user) setSmtpUser(s.smtp_user);
      if (s.smtp_from_name) setSmtpFromName(s.smtp_from_name);
      if (s.smtp_from_email) setSmtpFromEmail(s.smtp_from_email);
      if (s.smtp_use_tls !== undefined) setSmtpUseTls(s.smtp_use_tls === "true");
      if (s.imap_host) setImapHost(s.imap_host);
      if (s.imap_port) setImapPort(s.imap_port);
      if (s.imap_user) setImapUser(s.imap_user);
      if (s.session_timeout) setSessionTimeout(s.session_timeout);
      if (s.require_email_verify !== undefined) setRequireEmailVerify(s.require_email_verify === "true");
      if (s.notify_new_lead !== undefined) setNotifyNewLead(s.notify_new_lead === "true");
      if (s.notify_quote_approved !== undefined) setNotifyQuoteApproved(s.notify_quote_approved === "true");
      if (s.notify_repair_complete !== undefined) setNotifyRepairComplete(s.notify_repair_complete === "true");
      if (s.notify_warranty_claim !== undefined) setNotifyWarrantyClaim(s.notify_warranty_claim === "true");
    }
  }, [serverSettings]);

  useEffect(() => {
    if (smsSettings) {
      setSmsUsername(smsSettings.username);
      setSmsWebhookSecret(smsSettings.webhook_secret || "");
      setSmsIsActive(smsSettings.is_active);
    }
  }, [smsSettings]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const smsUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSmsSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-settings"] });
    },
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (activeSection === "sms") {
        await smsUpdateMutation.mutateAsync({
          gateway_url: "https://api.sms-gate.app",
          username: smsUsername,
          webhook_secret: smsWebhookSecret,
          is_active: smsIsActive,
        });
      } else {
        const settingsToSave: Record<string, string> = {};

        if (activeSection === "business") {
          settingsToSave.business_name = businessName;
          settingsToSave.business_email = businessEmail;
          settingsToSave.business_phone = businessPhone;
          settingsToSave.abn = abn;
        } else if (activeSection === "branding") {
          settingsToSave.primary_color = primaryColor;
          settingsToSave.accent_color = accentColor;
          settingsToSave.logo_url = logoUrl;
          settingsToSave.admin_logo_url = adminLogoUrl;
          settingsToSave.favicon_url = faviconUrl;
          settingsToSave.email_signature = emailSignature;
        } else if (activeSection === "email") {
          settingsToSave.smtp_host = smtpHost;
          settingsToSave.smtp_port = smtpPort;
          settingsToSave.smtp_user = smtpUser;
          settingsToSave.smtp_password = smtpPassword;
          settingsToSave.smtp_from_name = smtpFromName;
          settingsToSave.smtp_from_email = smtpFromEmail;
          settingsToSave.smtp_use_tls = String(smtpUseTls);
        } else if (activeSection === "email-incoming") {
          settingsToSave.imap_host = imapHost;
          settingsToSave.imap_port = imapPort;
          settingsToSave.imap_user = imapUser;
          settingsToSave.imap_password = imapPassword;
        } else if (activeSection === "security") {
          settingsToSave.session_timeout = sessionTimeout;
          settingsToSave.require_email_verify = String(requireEmailVerify);
        } else if (activeSection === "notifications") {
          settingsToSave.notify_new_lead = String(notifyNewLead);
          settingsToSave.notify_quote_approved = String(notifyQuoteApproved);
          settingsToSave.notify_repair_complete = String(notifyRepairComplete);
          settingsToSave.notify_warranty_claim = String(notifyWarrantyClaim);
        }

        await Promise.all(
          Object.entries(settingsToSave).map(([key, value]) =>
            updateMutation.mutateAsync({ key, value })
          )
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    if (smsSettings?.webhook_url) {
      navigator.clipboard.writeText(smsSettings.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const result = await uploadLogo(file);
      setLogoUrl(result.url);
    } catch {
      setError("Failed to upload logo. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdminLogoPreview(URL.createObjectURL(file));
    setAdminLogoUploading(true);
    try {
      const result = await uploadAdminLogo(file);
      setAdminLogoUrl(result.url);
    } catch {
      setError("Failed to upload admin logo. Please try again.");
    } finally {
      setAdminLogoUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconPreview(URL.createObjectURL(file));
    setFaviconUploading(true);
    try {
      const result = await uploadFavicon(file);
      setFaviconUrl(result.url);
    } catch {
      setError("Failed to upload favicon. Please try again.");
    } finally {
      setFaviconUploading(false);
    }
  };

  const handleEmailSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEmailSigPreview(URL.createObjectURL(file));
    setEmailSigUploading(true);
    try {
      const result = await uploadEmailSignature(file);
      setEmailSignature(result.url);
    } catch {
      setError("Failed to upload email signature. Please try again.");
    } finally {
      setEmailSigUploading(false);
    }
  };

  const isLoading = isLoadingSettings || isLoadingSms;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-surface-100">Settings</h1>
        <p className="mt-1 text-surface-400">Manage your application settings</p>
      </div>

      {saved && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-400">
          <CheckCircle className="h-4 w-4" /> Settings saved successfully.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                    activeSection === section.id
                      ? "bg-accent-500/10 text-accent-500"
                      : "text-surface-400 hover:bg-surface-900 hover:text-surface-100"
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-lg border border-surface-800 bg-surface-900 p-6">
              {activeSection === "business" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">Business Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">Business Name</label>
                      <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Email</label>
                        <input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Phone</label>
                        <input type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">ABN</label>
                      <input type="text" value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="e.g. 12 345 678 901"
                        className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "branding" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">Branding</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Primary Color</label>
                        <div className="flex items-center gap-3">
                          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded border border-surface-700 bg-transparent" />
                          <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                            className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Accent Color</label>
                        <div className="flex items-center gap-3">
                          <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded border border-surface-700 bg-transparent" />
                          <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                            className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">Logo</label>
                      <div className="flex items-center gap-4">
                        {(logoPreview || logoUrl) && (
                          <img
                            src={logoPreview || logoUrl}
                            alt="Logo preview"
                            className="h-12 w-12 rounded-lg border border-surface-700 bg-surface-800 object-contain p-1"
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-surface-300 transition hover:border-accent-500 hover:text-surface-100">
                          {logoUploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                          ) : (
                            <Image className="h-4 w-4" />
                          )}
                          {logoUploading ? "Uploading..." : "Upload Logo"}
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg,.webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-surface-500">PNG, JPG, SVG or WebP. Max 5MB.</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">Admin Logo</label>
                      <div className="flex items-center gap-4">
                        {(adminLogoPreview || adminLogoUrl) && (
                          <img
                            src={adminLogoPreview || adminLogoUrl}
                            alt="Admin logo preview"
                            className="h-12 w-12 rounded-lg border border-surface-700 bg-surface-800 object-contain p-1"
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-surface-300 transition hover:border-accent-500 hover:text-surface-100">
                          {adminLogoUploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                          ) : (
                            <Image className="h-4 w-4" />
                          )}
                          {adminLogoUploading ? "Uploading..." : "Upload Admin Logo"}
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg,.webp"
                            onChange={handleAdminLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-surface-500">Shown in the admin sidebar. PNG, JPG, SVG or WebP. Max 5MB.</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">Favicon</label>
                      <div className="flex items-center gap-4">
                        {(faviconPreview || faviconUrl) && (
                          <img
                            src={faviconPreview || faviconUrl}
                            alt="Favicon preview"
                            className="h-8 w-8 rounded border border-surface-700 bg-surface-800 object-contain p-0.5"
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-surface-300 transition hover:border-accent-500 hover:text-surface-100">
                          {faviconUploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                          ) : (
                            <Image className="h-4 w-4" />
                          )}
                          {faviconUploading ? "Uploading..." : "Upload Favicon"}
                          <input
                            type="file"
                            accept=".png,.ico,.svg,.jpg,.jpeg"
                            onChange={handleFaviconUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-surface-500">PNG, ICO, SVG or JPG. Max 2MB.</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">Email Signature</label>
                      <div className="flex items-start gap-4">
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2 text-sm text-surface-300 hover:bg-surface-700 transition-colors">
                          <Image className="h-4 w-4" />
                          {emailSigUploading ? "Uploading..." : "Upload Signature Image"}
                          <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={handleEmailSigUpload} className="hidden" />
                        </label>
                        {emailSigPreview && (
                          <img src={emailSigPreview} alt="Email signature preview" className="h-16 w-auto rounded border border-surface-700 object-contain" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-surface-500">PNG, JPG, SVG or WebP. Max 5MB. This image will be appended to all outgoing emails.</p>
                      {emailSignature && (
                        <button type="button" onClick={() => { setEmailSignature(""); setEmailSigPreview(null); }}
                          className="mt-1 text-xs text-red-400 hover:text-red-300">Remove signature</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "email" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">SMTP (Outgoing Email)</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Host</label>
                        <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Port</label>
                        <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Username</label>
                        <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Password</label>
                        <input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="••••••••"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">From Name</label>
                        <input type="text" value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">From Email</label>
                        <input type="email" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} placeholder="repairs@example.com"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800 p-4">
                      <div>
                        <p className="text-sm font-medium text-surface-100">Use TLS</p>
                        <p className="text-xs text-surface-400">Enable TLS encryption for SMTP connection</p>
                      </div>
                      <button
                        onClick={() => setSmtpUseTls(!smtpUseTls)}
                        className={`relative h-6 w-11 rounded-full transition ${smtpUseTls ? "bg-accent-500" : "bg-surface-700"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${smtpUseTls ? "left-5.5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "email-incoming" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">IMAP (Incoming Email)</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Host</label>
                        <input type="text" value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.gmail.com"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Port</label>
                        <input type="text" value={imapPort} onChange={(e) => setImapPort(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Username</label>
                        <input type="text" value={imapUser} onChange={(e) => setImapUser(e.target.value)}
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-300">Password</label>
                        <input type="password" value={imapPassword} onChange={(e) => setImapPassword(e.target.value)} placeholder="••••••••"
                          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "sms" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">SMS Gateway Configuration</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800 p-4">
                      <div>
                        <p className="text-sm font-medium text-surface-100">SMS Service Active</p>
                        <p className="text-xs text-surface-400">Enable or disable all outgoing SMS functionality</p>
                      </div>
                      <button
                        onClick={() => setSmsIsActive(!smsIsActive)}
                        className={`relative h-6 w-11 rounded-full transition ${smsIsActive ? "bg-accent-500" : "bg-surface-700"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${smsIsActive ? "left-5.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    <div className="rounded-lg border border-accent-500/20 bg-accent-500/5 p-5">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-accent-500/10 p-2.5 text-accent-500">
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-100">Dedicated SMS Gateway</p>
                          <p className="mt-1 text-sm text-surface-400">
                            The application is currently configured to use a dedicated Android device as your SMS gateway.
                          </p>
                          <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
                            <div className="flex justify-between border-b border-surface-800 pb-1.5"><span className="text-surface-500">Provider</span><span className="text-surface-200">SMS Gate Cloud</span></div>
                            <div className="flex justify-between border-b border-surface-800 pb-1.5"><span className="text-surface-500">Username</span><span className="text-surface-200">8ACQBH</span></div>
                            <div className="flex justify-between border-b border-surface-800 pb-1.5"><span className="text-surface-500">Device ID</span><span className="font-mono text-surface-200">B8Xolb9...</span></div>
                            <div className="flex justify-between border-b border-surface-800 pb-1.5"><span className="text-surface-500">Auth Mode</span><span className="text-surface-200">Basic Auth</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-surface-800">
                      <h3 className="mb-3 text-sm font-semibold text-surface-100 uppercase tracking-wider">Incoming Webhooks</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-surface-300">Webhook URL</label>
                          <div className="flex gap-2">
                            <input type="text" readOnly value={smsSettings?.webhook_url || ""}
                              className="flex-1 rounded-lg border border-surface-700 bg-surface-950 px-4 py-2.5 text-surface-400 text-sm focus:outline-none" />
                            <button
                              onClick={copyWebhookUrl}
                              className="flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2 text-surface-100 hover:bg-surface-700 transition"
                            >
                              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="mt-1.5 text-xs text-surface-500">Copy this URL to your SMS Gate app settings to receive incoming messages.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "security" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">Security Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-surface-300">Session Timeout (minutes)</label>
                      <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}
                        className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-surface-100 focus:border-accent-500 focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800 p-4">
                      <div>
                        <p className="text-sm font-medium text-surface-100">Require Email Verification</p>
                        <p className="text-xs text-surface-400">New users must verify their email before accessing the portal</p>
                      </div>
                      <button
                        onClick={() => setRequireEmailVerify(!requireEmailVerify)}
                        className={`relative h-6 w-11 rounded-full transition ${requireEmailVerify ? "bg-accent-500" : "bg-surface-700"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${requireEmailVerify ? "left-5.5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "notifications" && (
                <div>
                  <h2 className="mb-6 font-heading text-xl font-semibold text-surface-100">Notification Preferences</h2>
                  <div className="space-y-3">
                    {[
                      { label: "New Lead", desc: "Get notified when a new lead is submitted", state: notifyNewLead, setter: setNotifyNewLead },
                      { label: "Quote Approved", desc: "Get notified when a customer approves a quote", state: notifyQuoteApproved, setter: setNotifyQuoteApproved },
                      { label: "Repair Complete", desc: "Get notified when a repair is completed", state: notifyRepairComplete, setter: setNotifyRepairComplete },
                      { label: "Warranty Claim", desc: "Get notified when a warranty claim is filed", state: notifyWarrantyClaim, setter: setNotifyWarrantyClaim },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800 p-4">
                        <div>
                          <p className="text-sm font-medium text-surface-100">{item.label}</p>
                          <p className="text-xs text-surface-400">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => item.setter(!item.state)}
                          className={`relative h-6 w-11 rounded-full transition ${item.state ? "bg-accent-500" : "bg-surface-700"}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${item.state ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-2.5 font-semibold text-surface-950 hover:bg-accent-400 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
