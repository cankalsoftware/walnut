import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Colors } from '../src/theme/colors';
import { INITIAL_SHOP_PRODUCTS, ShopProduct } from '../src/data/walnutLifecycle';
import { useWalnutCloud } from '../src/providers/ConvexClerkProvider';

function ConvexShopProductLoader({
  onLoaded,
}: {
  onLoaded: (items: ShopProduct[]) => void;
}) {
  const rows = useQuery(anyApi.shop.listProducts) as
    | Array<{
        _id: string;
        sku: string;
        name: string;
        category: 'sensor' | 'switch' | 'kit';
        priceUsd: number;
        description: string;
        inStock: boolean;
        imageUrl?: string | null;
      }>
    | undefined;

  React.useEffect(() => {
    if (rows && rows.length > 0) {
      onLoaded(
        rows.map((r) => ({
          id: r._id,
          sku: r.sku,
          name: r.name,
          category: r.category,
          priceUsd: r.priceUsd,
          description: r.description,
          inStock: r.inStock,
          imageUrl: r.imageUrl ?? null,
          iconName:
            r.category === 'switch'
              ? 'toggle'
              : r.category === 'kit'
                ? 'hardware-chip'
                : 'water',
        }))
      );
    }
  }, [rows, onLoaded]);

  return null;
}

export default function OrchardHardwareShopScreen() {
  const router = useRouter();
  const { isCloudConfigured } = useWalnutCloud();
  const [products, setProducts] = useState<ShopProduct[]>(INITIAL_SHOP_PRODUCTS);
  const [filter, setFilter] = useState<'all' | 'sensor' | 'switch' | 'kit'>(
    'all'
  );
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const visibleProducts =
    filter === 'all'
      ? products
      : products.filter((p) => p.category === filter);

  const addToCart = (product: ShopProduct) => {
    setOrderMessage(null);
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
  };

  const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const totalPrice = products.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * p.priceUsd,
    0
  );

  const handleCheckout = () => {
    if (totalItems === 0) return;
    setOrderMessage(
      `Order reserved for ${totalItems} item(s) ($${totalPrice}). Card checkout (Stripe) will be completed at dispatch.`
    );
    setCart({});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {isCloudConfigured && <ConvexShopProductLoader onLoaded={setProducts} />}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={Colors.walnutGreen[900]}
            />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.cartPill}>
            <Ionicons name="cart" size={15} color={Colors.walnutGreen[900]} />
            <Text style={styles.cartPillText}>
              {totalItems} items • ${totalPrice}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Orchard Sensors & Switches Shop</Text>
        <Text style={styles.subtitle}>
          Plug-and-play soil probes, weather stations, and smart irrigation
          switches built for WalnutIQ.
        </Text>

        {/* Category Filter */}
        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'sensor', label: 'Sensors' },
              { key: 'switch', label: 'Switches' },
              { key: 'kit', label: 'Starter Kits' },
            ] as const
          ).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                filter === f.key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {orderMessage && (
          <View style={styles.orderBanner}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={Colors.walnutGreen[900]}
            />
            <Text style={styles.orderBannerText}>{orderMessage}</Text>
          </View>
        )}

        {/* Product List */}
        {visibleProducts.map((item) => {
          const qty = cart[item.id] || 0;
          return (
            <View key={item.id} style={styles.productCard}>
              <View style={styles.productTop}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: Colors.walnutGreen[100],
                    }}
                  />
                ) : (
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name={item.iconName as any}
                      size={22}
                      color={Colors.walnutGreen[800]}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.productCategory}>
                    {item.category.toUpperCase()} • {item.sku}
                  </Text>
                  <Text style={styles.productName}>{item.name}</Text>
                </View>
                <Text style={styles.productPrice}>${item.priceUsd}</Text>
              </View>

              <Text style={styles.productDesc}>{item.description}</Text>

              <View style={styles.productFooter}>
                <Text style={styles.stockText}>
                  {item.inStock ? '● In Stock • Ready to Ship' : 'Out of Stock'}
                </Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => addToCart(item)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>
                    {qty > 0 ? `Add (${qty} in Cart)` : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Checkout Button */}
        {totalItems > 0 && (
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Ionicons name="card-outline" size={18} color="#FFFFFF" />
            <Text style={styles.checkoutBtnText}>
              {`Place Order (${totalItems} items • $${totalPrice})`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    gap: 6,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  cartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  cartPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  filterChipActive: {
    backgroundColor: Colors.walnutGreen[700],
    borderColor: Colors.walnutGreen[800],
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[500],
    gap: 8,
    marginBottom: 14,
  },
  orderBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  productCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    marginBottom: 12,
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.walnutGreen[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.walnutGreen[700],
  },
  productDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[700],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[600],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutShell[500],
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 6,
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
