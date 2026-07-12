import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Package, ChevronLeft, ChevronRight, Edit, Trash2, AlertCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { listInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from "../../api/inventory";
import type { InventoryItem, CreateInventoryItemRequest } from "../../types";

const CATEGORIES = [
  "Screens",
  "Batteries",
  "Charging",
  "Audio",
  "Cameras",
  "Buttons",
  "Cases",
  "Tools",
  "Other",
];

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemMinStock, setNewItemMinStock] = useState(0);
  const [newItemLocation, setNewItemLocation] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const pageSize = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-inventory", page, search, categoryFilter],
    queryFn: () => listInventory(page * pageSize, pageSize, search || undefined, categoryFilter || undefined),
  });

  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      setShowNewItem(false);
      resetNewItemForm();
    },
    onError: () => alert("Failed to add inventory item"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, item }: { id: string; item: Partial<CreateInventoryItemRequest> }) => updateInventoryItem(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      setEditingItem(null);
    },
    onError: () => alert("Failed to update inventory item"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-inventory"] }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const resetNewItemForm = () => {
    setNewItemName("");
    setNewItemSku("");
    setNewItemCategory("");
    setNewItemQuantity(0);
    setNewItemPrice(0);
    setNewItemMinStock(0);
    setNewItemLocation("");
    setNewItemNotes("");
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleAddItem = () => {
    createMutation.mutate({
      name: newItemName,
      sku: newItemSku || null,
      category: newItemCategory || null,
      quantity: newItemQuantity,
      unit_price: newItemPrice,
      min_stock: newItemMinStock,
      location: newItemLocation || null,
      notes: newItemNotes || null,
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateMutation.mutate({
      id: editingItem.id,
      item: {
        name: editingItem.name,
        sku: editingItem.sku,
        category: editingItem.category,
        quantity: editingItem.quantity,
        unit_price: editingItem.unit_price,
        min_stock: editingItem.min_stock,
        location: editingItem.location,
        notes: editingItem.notes,
      },
    });
  };

  const isLowStock = (item: InventoryItem) => item.quantity <= item.min_stock && item.quantity > 0;
  const isOutOfStock = (item: InventoryItem) => item.quantity === 0;

  return (
    <div className="min-h-screen bg-rms-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-rms-text">Inventory</h1>
            <p className="mt-1 text-rms-text-secondary">{data?.total ?? 0} items in stock</p>
          </div>
          <button
            onClick={() => setShowNewItem(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-5 w-5" /> Add Item
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rms-text-secondary" />
            <input
              type="text"
              placeholder="Search by name, SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-rms-border bg-rms-surface py-2.5 pl-11 pr-4 text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-rms-border bg-rms-surface px-4 py-2.5 text-rms-text focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto rounded-lg border border-rms-border bg-rms-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-rms-border bg-rms-raised text-left text-sm font-medium text-rms-text-secondary">
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rms-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-12 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-rms-raised" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                      <p className="text-red-400">Failed to load inventory</p>
                    </div>
                  </td>
                </tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-12 w-12 text-rms-text-secondary" />
                      <p className="text-rms-text-secondary">No inventory items found</p>
                      <button
                        onClick={() => setShowNewItem(true)}
                        className="text-xs text-brand-500 hover:text-brand-600"
                      >
                        Add your first item
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((item: InventoryItem) => (
                  <tr key={item.id} className="transition hover:bg-rms-raised">
                    <td className="px-5 py-4">
                      <span className="font-medium text-rms-text">{item.name}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary font-mono">
                      {item.sku || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">
                      {item.category || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "text-sm font-medium",
                        isOutOfStock(item) ? "text-red-400" : isLowStock(item) ? "text-amber-400" : "text-rms-text"
                      )}>
                        {item.quantity}
                        {isOutOfStock(item) && <span className="ml-1 text-xs">(Out of stock)</span>}
                        {isLowStock(item) && <span className="ml-1 text-xs">(Low)</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-sm text-rms-text-secondary">
                      {item.location || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="rounded-lg border border-rms-border px-2.5 py-1.5 text-xs text-rms-text-secondary hover:bg-rms-raised"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this inventory item?")) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-rms-text-secondary">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 rounded-lg border border-rms-border px-4 py-2 text-sm font-medium text-rms-text-secondary transition-colors hover:bg-rms-raised disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showNewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-rms-border bg-rms-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-rms-text">New Inventory Item</h2>
              <button onClick={() => setShowNewItem(false)} className="text-rms-text-secondary hover:text-rms-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">SKU</label>
                  <input
                    type="text"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Min Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Unit Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Location</label>
                <input
                  type="text"
                  value={newItemLocation}
                  onChange={(e) => setNewItemLocation(e.target.value)}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Notes</label>
                <textarea
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNewItem(false)}
                  className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim() || createMutation.isPending}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Adding..." : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-rms-border bg-rms-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-rms-text">Edit Item</h2>
              <button onClick={() => setEditingItem(null)} className="text-rms-text-secondary hover:text-rms-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Name *</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">SKU</label>
                  <input
                    type="text"
                    value={editingItem.sku || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value || null })}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Category</label>
                  <select
                    value={editingItem.category || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value || null })}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Min Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.min_stock}
                    onChange={(e) => setEditingItem({ ...editingItem, min_stock: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Unit Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingItem.unit_price}
                  onChange={(e) => setEditingItem({ ...editingItem, unit_price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Location</label>
                <input
                  type="text"
                  value={editingItem.location || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value || null })}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-rms-text-secondary">Notes</label>
                <textarea
                  value={editingItem.notes || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value || null })}
                  rows={2}
                  className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateItem}
                  disabled={updateMutation.isPending}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}