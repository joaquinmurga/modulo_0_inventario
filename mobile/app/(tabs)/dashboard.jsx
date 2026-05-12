import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getServerUrl } from '../../src/config';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';
import NoServer from '../../src/components/NoServer';

const CATEGORIES = ['Lacteos', 'Bebidas', 'Limpieza', 'Snacks', 'Electronica', 'Ropa', 'Otro'];

// Modal editar / crear producto
function ProductFormModal({ product, initialBarcode = '', onSave, onClose }) {
  const isCreate = !product;
  const [barcode, setBarcode] = useState(product?.barcode || initialBarcode);
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);

  async function pickAndAnalyze(useCamera) {
    setAiError(null);
    const fn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setAnalyzing(true);
    try {
      const asset = result.assets[0];
      const { data } = await api.analyzeImage(asset.base64, 'image/jpeg', barcode || initialBarcode);
      const parts = [data.brand, data.model, data.name].filter(Boolean);
      if (parts.length) setName(parts.join(' - ').substring(0, 80));
      if (data.category) {
        const match = CATEGORIES.find(c =>
          c.toLowerCase().includes(data.category.toLowerCase()) ||
          data.category.toLowerCase().includes(c.toLowerCase())
        );
        setCategory(match || data.category);
      }
      const desc = [data.capacity && `Cap: ${data.capacity}`, data.description].filter(Boolean);
      if (desc.length) setDescription(desc.join(', '));
    } catch (err) {
      setAiError(err.message || 'Error al analizar la imagen');
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit() {
    if (!name.trim() || (isCreate && !barcode.trim())) return;
    setLoading(true);
    await onSave({ id: product?.product_id, barcode, name: name.trim(), category, description: description.trim(), price: parseFloat(price) || 0 });
    setLoading(false);
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={ms.title}>{isCreate ? 'Nuevo producto' : 'Editar producto'}</Text>

            <Text style={ms.label}>Codigo de barras{isCreate ? ' *' : ''}</Text>
            <TextInput value={barcode} onChangeText={setBarcode} editable={isCreate}
              style={[ms.input, !isCreate && ms.inputDisabled]} autoCapitalize="none" autoCorrect={false} />

            <Text style={ms.aiLabel}>Completar con IA</Text>
            <View style={ms.aiRow}>
              <TouchableOpacity style={ms.aiBtn} onPress={() => pickAndAnalyze(true)} disabled={analyzing}>
                <Ionicons name="camera-outline" size={16} color={colors.primary} />
                <Text style={ms.aiBtnText}>Tomar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ms.aiBtn} onPress={() => pickAndAnalyze(false)} disabled={analyzing}>
                <Ionicons name="images-outline" size={16} color={colors.primary} />
                <Text style={ms.aiBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>
            {analyzing && (
              <View style={ms.analyzingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={ms.analyzingText}>Analizando con IA...</Text>
              </View>
            )}
            {aiError && <Text style={ms.aiError}>{aiError}</Text>}

            <Text style={ms.label}>Nombre *</Text>
            <TextInput value={name} onChangeText={setName} style={ms.input} />

            <Text style={ms.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['', ...CATEGORIES].map((c) => (
                <TouchableOpacity key={c || '__none'} onPress={() => setCategory(c)}
                  style={[ms.pill, category === c && ms.pillActive]}>
                  <Text style={[ms.pillText, category === c && ms.pillTextActive]}>{c || 'Sin categoria'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={ms.label}>Descripcion</Text>
            <TextInput value={description} onChangeText={setDescription} style={ms.input} />

            <Text style={ms.label}>Precio</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={ms.input} />

            <View style={ms.actions}>
              <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
                <Text style={ms.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ms.saveBtn, loading && ms.btnDisabled]}
                onPress={submit} disabled={loading}>
                <Text style={ms.saveText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Modal ajustar cantidad
function AdjustModal({ product, blocks, onSave, onClose }) {
  const [action, setAction] = useState('add');
  const [qty, setQty] = useState('1');
  const [block, setBlock] = useState(blocks[0] || '');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const q = parseInt(qty) || 1;
    const finalQty = action === 'add' ? q : -q;
    setLoading(true);
    await onSave(product.product_id, block, finalQty);
    setLoading(false);
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <Text style={ms.title}>Ajustar cantidad</Text>
          <Text style={ms.subtitle}>{product.name}</Text>

          <View style={ms.toggleRow}>
            <TouchableOpacity style={[ms.toggleBtn, action === 'add' && ms.toggleAdd]} onPress={() => setAction('add')}>
              <Text style={[ms.toggleText, action === 'add' && ms.toggleTextActive]}>Agregar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ms.toggleBtn, action === 'remove' && ms.toggleRemove]} onPress={() => setAction('remove')}>
              <Text style={[ms.toggleText, action === 'remove' && ms.toggleTextActive]}>Retirar</Text>
            </TouchableOpacity>
          </View>

          <Text style={ms.label}>Cantidad</Text>
          <View style={ms.qtyRow}>
            <TouchableOpacity style={ms.qtyBtn} onPress={() => setQty(String(Math.max(1, parseInt(qty || 1) - 1)))}>
              <Text style={ms.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput value={qty} onChangeText={setQty} keyboardType="number-pad" style={ms.qtyInput} />
            <TouchableOpacity style={ms.qtyBtn} onPress={() => setQty(String(parseInt(qty || 1) + 1))}>
              <Text style={ms.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={ms.label}>Bloque</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {blocks.map((b) => (
              <TouchableOpacity key={b} onPress={() => setBlock(b)} style={[ms.pill, block === b && ms.pillActive]}>
                <Text style={[ms.pillText, block === b && ms.pillTextActive]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={ms.actions}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
              <Text style={ms.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.saveBtn, { backgroundColor: action === 'add' ? colors.success : colors.danger }, loading && ms.btnDisabled]}
              onPress={submit} disabled={loading}>
              <Text style={ms.saveText}>{loading ? 'Guardando...' : action === 'add' ? 'Agregar' : 'Retirar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const [serverOk, setServerOk] = useState(null);
  const [stock, setStock] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchTimer = useRef(null);
  const currentSearch = useRef('');
  const [editProduct, setEditProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [createBarcode, setCreateBarcode] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getServerUrl().then((url) => setServerOk(!!url));
  }, []);

  const fetchData = useCallback(async (q = null) => {
    if (!serverOk) return;
    setLoading(true);
    try {
      const [stockRes, blocksRes] = await Promise.all([api.getLogs(null, q), api.getBlocks()]);
      setStock(stockRes.data);
      setBlocks(blocksRes.data);
    } catch {/* silencioso */}
    setLoading(false);
  }, [serverOk]);

  useEffect(() => { fetchData(null); }, [fetchData]);

  function handleSearchChange(text) {
    setSearch(text);
    currentSearch.current = text;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchData(text.trim() || null);
    }, 400);
  }

  async function handleSaveEdit({ id, barcode, name, category, description, price }) {
    await api.updateProduct(id, { name, category, description, price });
    setEditProduct(null);
    fetchData(currentSearch.current.trim() || null);
  }

  async function handleCreate({ barcode, name, category, description, price }) {
    await api.createProduct({ barcode, name, category, description, price });
    setShowCreate(false);
    setCreateBarcode('');
    fetchData(currentSearch.current.trim() || null);
  }

  async function handleAdjust(product_id, location_block, quantity) {
    await api.adjustQuantity(product_id, location_block, quantity);
    setAdjustProduct(null);
    fetchData(currentSearch.current.trim() || null);
  }

  function confirmDelete(row) {
    Alert.alert('Eliminar producto', `Eliminar "${row.name}" y todos sus registros?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await api.deleteProduct(row.product_id); fetchData(currentSearch.current.trim() || null); } },
    ]);
  }

  async function handleSearchScan() {
    const code = search.trim();
    if (!code) return;
    const found = stock.find((r) => r.barcode === code);
    if (found) {
      setAdjustProduct(found);
    } else {
      setCreateBarcode(code);
      setShowCreate(true);
    }
    setSearch('');
    currentSearch.current = '';
    fetchData(null);
  }

  const filtered = stock;

  const totalUnits = stock.reduce((s, r) => s + (r.total_quantity || 0), 0);

  if (serverOk === null) return <View style={styles.screen} />;
  if (!serverOk) return <View style={styles.screen}><NoServer /></View>;

  return (
    <View style={styles.screen}>
      {editProduct && <ProductFormModal product={editProduct} onSave={handleSaveEdit} onClose={() => setEditProduct(null)} />}
      {showCreate && <ProductFormModal product={null} initialBarcode={createBarcode} onSave={handleCreate} onClose={() => { setShowCreate(false); setCreateBarcode(''); }} />}
      {adjustProduct && <AdjustModal product={adjustProduct} blocks={blocks.length ? blocks : ['General']} onSave={handleAdjust} onClose={() => setAdjustProduct(null)} />}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Productos</Text>
            <Text style={styles.statValue}>{stock.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Unidades</Text>
            <Text style={styles.statValue}>{totalUnits}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchScan}
            returnKeyType="search"
            placeholder="Buscar o escanear codigo..."
            placeholderTextColor={colors.gray400}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.newBtn} onPress={() => { setCreateBarcode(''); setShowCreate(true); }}>
            <Ionicons name="add" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.product_id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardMain}>
                <View style={styles.cardInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productBarcode}>{item.barcode}</Text>
                  {item.category ? <Text style={styles.productCategory}>{item.category}</Text> : null}
                  {item.description ? <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text> : null}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.qty}>{item.total_quantity}</Text>
                  {item.price > 0 && <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.actionGreen]} onPress={() => setAdjustProduct(item)}>
                  <Ionicons name="swap-vertical-outline" size={15} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>Ajustar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBlue]} onPress={() => setEditProduct(item)}>
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionRed]} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sin productos. Escanea o crea uno.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.gray50 },
  header:    { backgroundColor: colors.white, padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  statsRow:  { flexDirection: 'row', gap: spacing.sm },
  statCard:  { flex: 1, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: 11, color: colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.gray800,
  },
  newBtn: {
    backgroundColor: colors.primary,
    width: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list:      { padding: spacing.md, gap: spacing.sm },
  separator: { height: spacing.sm },
  card:      { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardMain:  { flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo:  { flex: 1, gap: 2, paddingRight: spacing.sm },
  productName:     { fontSize: 15, fontWeight: '600', color: colors.gray800 },
  productBarcode:  { fontSize: 11, color: colors.gray400, fontFamily: 'monospace' },
  productCategory: { fontSize: 12, color: colors.gray500 },
  productDesc:     { fontSize: 12, color: colors.gray400 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  qty:       { fontSize: 26, fontWeight: '800', color: colors.primary },
  price:     { fontSize: 12, color: colors.gray500 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs + 2, borderRadius: radius.md },
  actionGreen: { backgroundColor: colors.successLight },
  actionBlue:  { backgroundColor: colors.primaryLight },
  actionRed:   { backgroundColor: colors.dangerLight },
  actionText:  { fontSize: 12, fontWeight: '600' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: 14, color: colors.gray400, textAlign: 'center' },
});

// Estilos compartidos para modals
const ms = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  aiLabel:      { fontSize: 11, fontWeight: '600', color: colors.gray500, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm },
  aiRow:        { flexDirection: 'row', gap: spacing.sm },
  aiBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm + 2 },
  aiBtnText:    { color: colors.primary, fontWeight: '600', fontSize: 13 },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  analyzingText:{ fontSize: 12, color: colors.primary },
  aiError:      { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
  sheet:     { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%' },
  title:     { fontSize: 17, fontWeight: '700', color: colors.gray800, marginBottom: spacing.xs },
  subtitle:  { fontSize: 13, color: colors.gray500, marginBottom: spacing.md },
  label:     { fontSize: 13, fontWeight: '500', color: colors.gray700, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.md,
    padding: spacing.sm + 2, fontSize: 14, color: colors.gray800,
  },
  inputDisabled: { backgroundColor: colors.gray50, color: colors.gray500 },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: 99, borderWidth: 1, borderColor: colors.gray300, marginRight: spacing.xs, marginTop: spacing.xs },
  pillActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:       { fontSize: 12, color: colors.gray700 },
  pillTextActive: { color: colors.white, fontWeight: '600' },
  toggleRow:   { flexDirection: 'row', borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.md, overflow: 'hidden', marginTop: spacing.md },
  toggleBtn:   { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  toggleAdd:   { backgroundColor: colors.success },
  toggleRemove:{ backgroundColor: colors.danger },
  toggleText:  { fontSize: 14, fontWeight: '500', color: colors.gray600 },
  toggleTextActive: { color: colors.white, fontWeight: '700' },
  qtyRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  qtyBtn:    { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:{ fontSize: 20, color: colors.gray700, fontWeight: '600' },
  qtyInput:  { flex: 1, borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.md, padding: spacing.sm, fontSize: 16, textAlign: 'center', color: colors.gray800 },
  actions:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.md, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  cancelText:{ color: colors.gray700, fontWeight: '500', fontSize: 14 },
  saveBtn:   { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  saveText:  { color: colors.white, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
});
