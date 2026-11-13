import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

export interface ShopProductItem {
  id: string;
  convexId?: string;
  sku: string;
  name: string;
  category: 'sensor' | 'switch' | 'kit';
  priceUsd: number;
  description: string;
  inStock: boolean;
  imageStorageId?: string;
  imageUrl?: string | null;
}

const STORAGE_SHOP_KEY = 'walnutiq_shop_products';

const INITIAL_SHOP_PRODUCTS: ShopProductItem[] = [
  {
    id: 'shop-soil-30',
    sku: 'WIQ-SOIL-30',
    name: '30cm Root-Zone Soil Moisture & Temp Probe',
    category: 'sensor',
    priceUsd: 49,
    description:
      'Wireless probe for 30cm root zone moisture & soil temperature readings.',
    inStock: true,
    imageUrl: null,
  },
  {
    id: 'shop-valve-01',
    sku: 'WIQ-VALVE-01',
    name: 'Smart Drip Irrigation Solenoid Switch',
    category: 'switch',
    priceUsd: 64,
    description:
      'App-controlled orchard water valve switch with automated schedule & freeze shutoff.',
    inStock: true,
    imageUrl: null,
  },
  {
    id: 'shop-climate-pro',
    sku: 'WIQ-CLIMATE-PRO',
    name: 'Canopy Microclimate & Chill-Hour Sensor',
    category: 'sensor',
    priceUsd: 89,
    description:
      'Solar-powered air temp, humidity, and winter chill-hour tracker.',
    inStock: true,
    imageUrl: null,
  },
  {
    id: 'shop-kit-start',
    sku: 'WIQ-KIT-START',
    name: 'Orchard Starter Kit (2 Probes + 1 Switch)',
    category: 'kit',
    priceUsd: 179,
    description:
      'Complete plug-and-play orchard monitoring & automated drip valve bundle.',
    inStock: true,
    imageUrl: null,
  },
];

interface ShopAdminTabProps {
  hasConvex: boolean;
  onNotice: (msg: string) => void;
  styles: Record<string, React.CSSProperties>;
}

/**
 * Inner component mounted only when `<ConvexProvider>` is active.
 */
function ConvexShopAdminInner({
  onNotice,
  styles,
}: Omit<ShopAdminTabProps, 'hasConvex'>) {
  const convexProducts = useQuery(anyApi.shop.listProducts) as
    | Array<{
        _id: string;
        sku: string;
        name: string;
        category: 'sensor' | 'switch' | 'kit';
        priceUsd: number;
        description: string;
        inStock: boolean;
        imageStorageId?: string;
        imageUrl?: string | null;
      }>
    | undefined;

  const generateUploadUrl = useMutation(anyApi.shop.generateUploadUrl);
  const upsertProduct = useMutation(anyApi.shop.upsertProduct);
  const toggleStockMutation = useMutation(anyApi.shop.toggleStock);
  const updatePriceMutation = useMutation(anyApi.shop.updatePrice);
  const updateProductImageMutation = useMutation(
    anyApi.shop.updateProductImage
  );

  const mappedProducts: ShopProductItem[] | undefined = convexProducts?.map(
    (p) => ({
      id: p._id,
      convexId: p._id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      priceUsd: p.priceUsd,
      description: p.description,
      inStock: p.inStock,
      imageStorageId: p.imageStorageId,
      imageUrl: p.imageUrl ?? null,
    })
  );

  const uploadBlobToConvex = async (file: File): Promise<string> => {
    const postUrl = await generateUploadUrl({});
    const res = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }
    const json = (await res.json()) as { storageId: string };
    return json.storageId;
  };

  return (
    <ShopAdminView
      isConvexConnected={true}
      convexProducts={mappedProducts}
      onUploadBlob={uploadBlobToConvex}
      onUpsertConvex={async (item) => {
        await upsertProduct({
          sku: item.sku,
          name: item.name,
          category: item.category,
          priceUsd: item.priceUsd,
          description: item.description,
          inStock: item.inStock,
          imageStorageId: item.imageStorageId as any,
        });
      }}
      onToggleConvexStock={async (convexId) => {
        await toggleStockMutation({ id: convexId as any });
      }}
      onUpdateConvexPrice={async (convexId, priceUsd) => {
        await updatePriceMutation({ id: convexId as any, priceUsd });
      }}
      onAttachConvexImage={async (convexId, storageId) => {
        await updateProductImageMutation({
          id: convexId as any,
          imageStorageId: storageId as any,
        });
      }}
      onNotice={onNotice}
      styles={styles}
    />
  );
}

interface ShopAdminViewProps {
  isConvexConnected: boolean;
  convexProducts?: ShopProductItem[];
  onUploadBlob?: (file: File) => Promise<string>;
  onUpsertConvex?: (item: ShopProductItem) => Promise<void>;
  onToggleConvexStock?: (convexId: string) => Promise<void>;
  onUpdateConvexPrice?: (convexId: string, priceUsd: number) => Promise<void>;
  onAttachConvexImage?: (convexId: string, storageId: string) => Promise<void>;
  onNotice: (msg: string) => void;
  styles: Record<string, React.CSSProperties>;
}

function ShopAdminView({
  isConvexConnected,
  convexProducts,
  onUploadBlob,
  onUpsertConvex,
  onToggleConvexStock,
  onUpdateConvexPrice,
  onAttachConvexImage,
  onNotice,
  styles,
}: ShopAdminViewProps) {
  const [localProducts, setLocalProducts] = useState<ShopProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHOP_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SHOP_PRODUCTS;
    } catch {
      return INITIAL_SHOP_PRODUCTS;
    }
  });

  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'sensor' | 'switch' | 'kit'>(
    'sensor'
  );
  const [newPrice, setNewPrice] = useState<number>(59);
  const [newDesc, setNewDesc] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const products =
    isConvexConnected && convexProducts && convexProducts.length > 0
      ? convexProducts
      : localProducts;

  const persistLocal = (items: ShopProductItem[]) => {
    setLocalProducts(items);
    localStorage.setItem(STORAGE_SHOP_KEY, JSON.stringify(items));
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleUploadExistingImage = async (
    item: ShopProductItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(item.id);
    try {
      if (isConvexConnected && onUploadBlob && onUpsertConvex) {
        const storageId = await onUploadBlob(file);
        if (item.convexId && onAttachConvexImage) {
          await onAttachConvexImage(item.convexId, storageId);
        } else {
          await onUpsertConvex({ ...item, imageStorageId: storageId });
        }
        onNotice(`Uploaded image blob to Convex for "${item.name}".`);
      } else {
        const dataUrl = await fileToDataUrl(file);
        const next = localProducts.map((p) =>
          p.id === item.id ? { ...p, imageUrl: dataUrl } : p
        );
        persistLocal(next);
        onNotice(`Saved image preview locally for "${item.name}".`);
      }
    } catch (err) {
      onNotice(
        `Image upload failed: ${err instanceof Error ? err.message : 'Check Convex connection'}`
      );
    } finally {
      setUploadingId(null);
    }
  };

  const handleToggleStock = async (item: ShopProductItem) => {
    if (item.convexId && onToggleConvexStock) {
      await onToggleConvexStock(item.convexId);
      onNotice(`Updated stock status for "${item.name}" in Convex.`);
      return;
    }
    const next = localProducts.map((p) =>
      p.id === item.id ? { ...p, inStock: !p.inStock } : p
    );
    persistLocal(next);
    onNotice('Updated shop hardware stock availability.');
  };

  const handleUpdatePrice = async (item: ShopProductItem, priceUsd: number) => {
    const safePrice = Math.max(1, priceUsd);
    if (item.convexId && onUpdateConvexPrice) {
      await onUpdateConvexPrice(item.convexId, safePrice);
      return;
    }
    const next = localProducts.map((p) =>
      p.id === item.id ? { ...p, priceUsd: safePrice } : p
    );
    persistLocal(next);
  };

  const handleAddProduct = async () => {
    if (!newName.trim() || !newSku.trim()) {
      onNotice('Please provide both a SKU and Product Name.');
      return;
    }
    setIsSaving(true);
    try {
      let imageStorageId: string | undefined;
      let localPreviewUrl: string | null = null;

      if (newImageFile) {
        if (isConvexConnected && onUploadBlob) {
          imageStorageId = await onUploadBlob(newImageFile);
        } else {
          localPreviewUrl = await fileToDataUrl(newImageFile);
        }
      }

      const newItem: ShopProductItem = {
        id: `shop-${Date.now()}`,
        sku: newSku.trim().toUpperCase(),
        name: newName.trim(),
        category: newCategory,
        priceUsd: Math.max(1, Number(newPrice) || 49),
        description:
          newDesc.trim() ||
          'WalnutIQ-compatible orchard sensor or smart irrigation switch.',
        inStock: true,
        imageStorageId,
        imageUrl: localPreviewUrl,
      };

      if (isConvexConnected && onUpsertConvex) {
        await onUpsertConvex(newItem);
        onNotice(
          `Saved "${newItem.name}"${imageStorageId ? ' with Convex Blob image' : ''} to Convex.`
        );
      } else {
        persistLocal([newItem, ...localProducts]);
        onNotice(`Added "${newItem.name}" to local shop catalog.`);
      }

      setNewSku('');
      setNewName('');
      setNewPrice(59);
      setNewDesc('');
      setNewImageFile(null);
      setNewImagePreview(null);
    } catch (err) {
      onNotice(
        `Could not save product: ${err instanceof Error ? err.message : 'Run npx convex dev to sync schema'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedDefaultsToConvex = async () => {
    if (!onUpsertConvex) return;
    setIsSaving(true);
    try {
      for (const item of INITIAL_SHOP_PRODUCTS) {
        await onUpsertConvex(item);
      }
      onNotice('Seeded default sensors & switches into Convex.');
    } catch (err) {
      onNotice(
        `Seed failed: ${err instanceof Error ? err.message : 'Check npx convex dev'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.stack}>
      <section style={styles.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={styles.cardTitle}>
              Orchard Sensors & Smart Switches Catalog
            </h2>
            <p style={styles.cardDesc}>
              Upload product photos (stored as Convex Storage Blobs), toggle
              stock status, or adjust pricing.
            </p>
          </div>
          {isConvexConnected &&
            (!convexProducts || convexProducts.length === 0) && (
              <button
                style={styles.secondaryBtn}
                disabled={isSaving}
                onClick={handleSeedDefaultsToConvex}
              >
                Sync Starter Catalog to Convex
              </button>
            )}
        </div>

        <div style={styles.stack}>
          {products.map((item) => (
            <div key={item.id} style={styles.tableRow}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  paddingRight: 12,
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      objectFit: 'cover',
                      border: '1px solid #c5dbba',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      backgroundColor: '#e4f0dc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#3f6a34',
                      textAlign: 'center',
                      padding: 4,
                    }}
                  >
                    No Image
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong>{item.name}</strong>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        backgroundColor: '#e4f0dc',
                        color: '#2e5125',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.category} • {item.sku}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#4d5d47' }}>
                    {item.description}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <label
                  style={{
                    ...styles.secondaryBtn,
                    cursor: 'pointer',
                    display: 'inline-block',
                  }}
                >
                  {uploadingId === item.id ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleUploadExistingImage(item, e)}
                  />
                </label>

                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  $
                  <input
                    type="number"
                    style={{ ...styles.numInput, marginLeft: 4 }}
                    value={item.priceUsd}
                    onChange={(e) =>
                      handleUpdatePrice(item, Number(e.target.value) || 1)
                    }
                  />
                </label>

                <button
                  style={{
                    ...styles.secondaryBtn,
                    backgroundColor: item.inStock ? '#d9f2dc' : '#f8d7da',
                    color: item.inStock ? '#185b25' : '#842029',
                  }}
                  onClick={() => handleToggleStock(item)}
                >
                  {item.inStock ? 'In Stock' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Add New Sensor or Switch</h2>
        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>SKU Code</label>
            <input
              style={styles.input}
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              placeholder="e.g. WIQ-RELAY-02"
            />
          </div>
          <div>
            <label style={styles.label}>Category</label>
            <select
              style={styles.select}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
            >
              <option value="sensor">Sensor</option>
              <option value="switch">Smart Switch</option>
              <option value="kit">Starter Kit</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Product Name</label>
            <input
              style={styles.input}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dual-Zone Irrigation Relay"
            />
          </div>
          <div>
            <label style={styles.label}>Price (USD)</label>
            <input
              type="number"
              style={styles.input}
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <label style={styles.label}>Short Description</label>
        <input
          style={styles.input}
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Explain what orchard metric or valve this hardware controls..."
        />

        <label style={styles.label}>Product Image (Stored in Convex Blob)</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleNewImageSelect}
          />
          {newImagePreview && (
            <img
              src={newImagePreview}
              alt="Preview"
              style={{
                width: 64,
                height: 64,
                borderRadius: 10,
                objectFit: 'cover',
                border: '1px solid #b5d4a3',
              }}
            />
          )}
        </div>

        <button
          style={styles.primaryBtn}
          disabled={isSaving}
          onClick={handleAddProduct}
        >
          {isSaving ? 'Uploading & Saving...' : 'Add Hardware to Shop'}
        </button>
      </section>
    </div>
  );
}

export default function ShopAdminTab({
  hasConvex,
  onNotice,
  styles,
}: ShopAdminTabProps) {
  if (hasConvex) {
    return <ConvexShopAdminInner onNotice={onNotice} styles={styles} />;
  }
  return (
    <ShopAdminView
      isConvexConnected={false}
      onNotice={onNotice}
      styles={styles}
    />
  );
}

